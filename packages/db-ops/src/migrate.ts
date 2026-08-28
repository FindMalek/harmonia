import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");

dotenv.config({ path: path.join(repoRoot, ".env") });

const { runMigrationsFromEnv } = await import("./runner");

runMigrationsFromEnv()
	.then(() => {
		console.info("db-ops migrations applied successfully.");
	})
	.catch((err) => {
		console.error("db-ops migration failed:", err);
		process.exit(1);
	});
