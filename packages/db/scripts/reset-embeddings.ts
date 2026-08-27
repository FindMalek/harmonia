import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { Pool } from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");

dotenv.config({ path: path.join(repoRoot, ".env") });

const { dbEnv } = await import("@sonaraem/env/presets/db");

function assertSafeResetHost(databaseUrl: string): void {
	const parsed = new URL(databaseUrl);
	const host = parsed.hostname;
	const allowRemote = process.env.SONARAEM_ALLOW_DB_RESET_REMOTE === "true";
	const isLocal =
		host === "localhost" || host === "127.0.0.1" || host === "::1";

	if (!allowRemote && !isLocal) {
		console.error(
			`db:reset:embeddings refused: host "${host}" is not local. Set SONARAEM_ALLOW_DB_RESET_REMOTE=true only when you intend to modify a remote database.`,
		);
		process.exit(1);
	}

	console.info(
		`db:reset:embeddings: connecting (host=${host}, allowRemote=${String(allowRemote)})`,
	);
}

async function main(): Promise<void> {
	assertSafeResetHost(dbEnv.SONARAEM_DATABASE_URL);

	const pool = new Pool({ connectionString: dbEnv.SONARAEM_DATABASE_URL });

	try {
		const client = await pool.connect();
		try {
			const { rowCount } = await client.query(`
				UPDATE track
				SET
					embedding               = NULL,
					embedding_generated_at  = NULL,
					embedding_input         = NULL,
					updated_at              = NOW()
				WHERE embedding IS NOT NULL
			`);
			console.info(
				`db:reset:embeddings: nulled embeddings for ${String(rowCount ?? 0)} tracks (LLM classification preserved)`,
			);
		} catch (err) {
			console.error("db:reset:embeddings failed:", err);
			process.exitCode = 1;
		} finally {
			client.release();
		}
	} finally {
		await pool.end();
	}
}

await main();
