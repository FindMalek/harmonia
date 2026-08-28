import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { Pool } from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");

dotenv.config({ path: path.join(repoRoot, ".env") });

const { dbEnv } = await import("@harmonia/env/presets/db");

const TABLES_TO_TRUNCATE = [
	"user_playlist_snapshot_item_artists",
	"user_playlist_snapshot_items",
	"user_playlist_snapshots",
	"user_spotify_library_stats",
	"user_email_preferences",
	"email_send_log",
	"email_suppression",
	"playlist_tracks",
	"playlist_clusters",
	"playlist",
	"cluster_tracks",
	"cluster",
	"character_tracks",
	"character_clusters",
	"character",
	"external_api_call",
	"pipeline_run",
	"user_tracks",
	"harmonia_db_ops",
] as const;

/** Created by db-ops ensureOpsTable — may be absent after a fresh db:push. */
const OPTIONAL_TABLES = new Set(["harmonia_db_ops"]);

// Include track only with --all (tracks hold expensive computed data)
const EXTRA_ALL_TABLES = ["track"] as const;

function assertSafeResetHost(databaseUrl: string): void {
	const parsed = new URL(databaseUrl);
	const host = parsed.hostname;
	const allowRemote = process.env.HARMONIA_ALLOW_DB_RESET_REMOTE === "true";
	const isLocal =
		host === "localhost" || host === "127.0.0.1" || host === "::1";

	if (!allowRemote && !isLocal) {
		console.error(
			`db:reset refused: host "${host}" is not local. Set HARMONIA_ALLOW_DB_RESET_REMOTE=true only when you intend to truncate a remote database.`,
		);
		process.exit(1);
	}

	console.info(
		`db:reset: connecting (host=${host}, allowRemote=${String(allowRemote)})`,
	);
}

async function main(): Promise<void> {
	assertSafeResetHost(dbEnv.HARMONIA_DATABASE_URL);

	const includeAll = process.argv.includes("--all");
	const candidateTables = includeAll
		? ([...TABLES_TO_TRUNCATE, ...EXTRA_ALL_TABLES] as const)
		: TABLES_TO_TRUNCATE;

	const pool = new Pool({ connectionString: dbEnv.HARMONIA_DATABASE_URL });

	try {
		const client = await pool.connect();
		try {
			const tables: string[] = [];
			for (const name of candidateTables) {
				if (OPTIONAL_TABLES.has(name)) {
					const exists = await client.query<{ exists: string | null }>(
						"SELECT to_regclass($1) AS exists",
						[`public.${name}`],
					);
					if (exists.rows[0]?.exists == null) {
						console.info(`db:reset: skipping missing optional table ${name}`);
						continue;
					}
				}
				tables.push(name);
			}

			if (tables.length === 0) {
				console.info("db:reset: no tables to truncate");
				return;
			}

			const quotedTables = tables.map((t) => `"${t}"`).join(", ");
			const sql = `TRUNCATE TABLE ${quotedTables} RESTART IDENTITY CASCADE`;

			console.info(
				`db:reset: truncating ${String(tables.length)} tables${includeAll ? " (--all: includes track)" : ""}`,
			);

			await client.query("BEGIN");
			try {
				await client.query(sql);
				await client.query("COMMIT");
			} catch (err) {
				await client.query("ROLLBACK");
				throw err;
			}

			console.info(
				includeAll
					? "db:reset: done (auth, genre_domain, drizzle migrations unchanged; harmonia_db_ops truncated when present)"
					: "db:reset: done (auth, genre_domain, track, drizzle migrations unchanged; harmonia_db_ops truncated when present)",
			);
		} catch (err) {
			console.error("db:reset failed:", err);
			process.exitCode = 1;
		} finally {
			client.release();
		}
	} finally {
		await pool.end();
	}
}

await main();
