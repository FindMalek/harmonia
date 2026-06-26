import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
config({ path: path.resolve(root, ".env") });

const env = { ...process.env };
// The Trigger.dev CLI reads TRIGGER_* vars; the repo standardises on the
// HARMONIA_TRIGGER_* namespace, so map them across (mirrors run-trigger-dev.mjs).
if (!env.TRIGGER_SECRET_KEY && env.HARMONIA_TRIGGER_SECRET_KEY) {
	env.TRIGGER_SECRET_KEY = env.HARMONIA_TRIGGER_SECRET_KEY;
}
if (!env.TRIGGER_PROJECT_REF && env.HARMONIA_TRIGGER_PROJECT_REF) {
	env.TRIGGER_PROJECT_REF = env.HARMONIA_TRIGGER_PROJECT_REF;
}

const projectRef = (env.TRIGGER_PROJECT_REF ?? "").trim();
if (!projectRef) {
	console.error(
		"Missing Trigger project ref: set HARMONIA_TRIGGER_PROJECT_REF (or TRIGGER_PROJECT_REF) to your Trigger.dev prod project ref.",
	);
	process.exit(1);
}

if (!env.TRIGGER_SECRET_KEY) {
	console.error(
		"Missing Trigger secret key: set TRIGGER_SECRET_KEY (or HARMONIA_TRIGGER_SECRET_KEY) to deploy.",
	);
	process.exit(1);
}

// Matches the deploy command referenced in issue #137. Use `pnpm deploy:trigger`
// to push the apps/api Trigger.dev worker to production. (Local dev uses the
// long-running watcher via `pnpm trigger:dev` instead.)
const args = [
	"trigger.dev@latest",
	"deploy",
	"--config",
	"apps/api/trigger.config.ts",
];

console.log(`> npx ${args.join(" ")}  (project=${projectRef})`);

const child = spawn("npx", args, {
	stdio: "inherit",
	shell: true,
	env,
	cwd: root,
});

child.on("exit", (code) => {
	process.exit(code ?? 1);
});
