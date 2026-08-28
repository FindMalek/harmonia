import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");

dotenv.config({ path: path.join(repoRoot, ".env") });

const { parseMigrateArgs } = await import("./lib/parse-migrate-args");
const { runMigrationsFromEnv } = await import("./runner");

let options: ReturnType<typeof parseMigrateArgs>;
try {
	options = parseMigrateArgs(process.argv);
} catch (err) {
	console.error(err instanceof Error ? err.message : err);
	process.exit(1);
}

runMigrationsFromEnv(options)
	.then(() => {
		if (options.dryRun) {
			console.info("db-ops dry-run finished — no changes made.");
		} else {
			console.info("db-ops migrations applied successfully.");
		}
	})
	.catch((err) => {
		console.error("db-ops migration failed:", err);
		process.exit(1);
	});
