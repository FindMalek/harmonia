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
	"playlist_tracks",
	"playlist_clusters",
	"playlist",
	"cluster_tracks",
	"cluster",
	"character_tracks",
	"character_clusters",
	"character",
	"pipeline_run",
	"track",
	"todo",
] as const;

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

	const pool = new Pool({ connectionString: dbEnv.HARMONIA_DATABASE_URL });
	const quotedTables = TABLES_TO_TRUNCATE.map((t) => `"${t}"`).join(", ");
	const sql = `TRUNCATE TABLE ${quotedTables} RESTART IDENTITY CASCADE`;

	console.info(
		`db:reset: truncating ${String(TABLES_TO_TRUNCATE.length)} tables`,
	);

	try {
		const client = await pool.connect();
		try {
			await client.query("BEGIN");
			await client.query(sql);
			await client.query("COMMIT");
			console.info(
				"db:reset: done (auth, genre_domain, drizzle migrations unchanged)",
			);
		} catch (err) {
			await client.query("ROLLBACK");
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
