import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");

dotenv.config({ path: path.join(repoRoot, ".env") });

// drizzle-kit's own `migrate` CLI renders progress through a TUI spinner
// that swallows the real driver error on failure (CI just shows
// "Command failed with exit code 1" with no cause) — see #<issue>.
// This mirrors packages/db/src/index.ts's connection selection and calls
// drizzle-orm's migrate() directly so failures print the actual error.
async function main() {
	const connectionString = process.env.HARMONIA_DATABASE_URL;
	if (!connectionString) {
		throw new Error("HARMONIA_DATABASE_URL is not set");
	}

	const migrationsFolder = path.join(__dirname, "../src/migrations");

	if (connectionString.includes(".neon.tech")) {
		const { Pool, neonConfig } = await import("@neondatabase/serverless");
		const { drizzle } = await import("drizzle-orm/neon-serverless");
		const { migrate } = await import("drizzle-orm/neon-serverless/migrator");
		const ws = (await import("ws")).default;
		neonConfig.webSocketConstructor = ws;
		const pool = new Pool({ connectionString });
		const db = drizzle({ client: pool });
		await migrate(db, { migrationsFolder });
		await pool.end();
		return;
	}

	const { Pool } = await import("pg");
	const { drizzle } = await import("drizzle-orm/node-postgres");
	const { migrate } = await import("drizzle-orm/node-postgres/migrator");
	const pool = new Pool({ connectionString });
	const db = drizzle({ client: pool });
	await migrate(db, { migrationsFolder });
	await pool.end();
}

main()
	.then(() => {
		console.info("Migrations applied successfully.");
	})
	.catch((err) => {
		console.error("Migration failed:", err);
		process.exit(1);
	});
