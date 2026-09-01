import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPackageRoot = path.resolve(__dirname, "..");
dotenv.config({ path: path.resolve(dbPackageRoot, "../../.env") });

const url = process.env.SONARAEM_DATABASE_URL?.trim();
if (!url) {
	console.error(
		"ensure-pgvector: SONARAEM_DATABASE_URL is not set (see .env.example)",
	);
	process.exit(1);
}

const client = new pg.Client({ connectionString: url });
try {
	await client.connect();
	await client.query("CREATE EXTENSION IF NOT EXISTS vector");
} catch (err) {
	const message = err instanceof Error ? err.message : String(err);
	console.error(
		"ensure-pgvector: failed to enable pgvector. Use Postgres with pgvector (e.g. docker compose in docker/) or enable the extension in your host console.\n",
		message,
	);
	process.exit(1);
} finally {
	await client.end().catch(() => {});
}
