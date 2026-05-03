#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");

dotenv.config({ path: path.join(repoRoot, ".env") });

const databaseUrl = process.env.HARMONIA_DATABASE_URL;
if (!databaseUrl) {
	console.error(
		"HARMONIA_DATABASE_URL is not set. Ensure root .env exists with HARMONIA_DATABASE_URL.",
	);
	process.exit(1);
}

const parsed = new URL(databaseUrl);
const allowOverride = process.env.HARMONIA_ALLOW_DB_NUKE === "true";
const isLocalDocker =
	(parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") &&
	parsed.port === "5433";

if (!allowOverride && !isLocalDocker) {
	console.error(
		"db:nuke refused: expected HARMONIA_DATABASE_URL pointing at localhost:5433 (Docker Compose). Set HARMONIA_ALLOW_DB_NUKE=true only if you accept wiping a non-default target.",
	);
	process.exit(1);
}

const composeFile = path.join(repoRoot, "docker/docker-compose.yml");

function runDockerCompose(args) {
	const result = spawnSync("docker", ["compose", "-f", composeFile, ...args], {
		cwd: repoRoot,
		stdio: "inherit",
		env: process.env,
	});
	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
}

console.info("db:nuke: docker compose down -v");
runDockerCompose(["down", "-v"]);

console.info("db:nuke: docker compose up -d");
runDockerCompose(["up", "-d"]);

console.info("db:nuke: waiting for Postgres…");
for (let i = 0; i < 60; i++) {
	const ready = spawnSync(
		"docker",
		[
			"compose",
			"-f",
			composeFile,
			"exec",
			"-T",
			"postgres",
			"pg_isready",
			"-U",
			"postgres",
			"-d",
			"harmonia",
		],
		{ cwd: repoRoot, encoding: "utf-8" },
	);
	if (ready.status === 0) {
		break;
	}
	if (i === 59) {
		console.error("db:nuke: Postgres did not become ready in time");
		process.exit(1);
	}
	await delay(1000);
}

console.info("db:nuke: pnpm db:push");
const push = spawnSync("pnpm", ["db:push"], {
	cwd: repoRoot,
	stdio: "inherit",
	env: process.env,
});
if (push.status !== 0) {
	process.exit(push.status ?? 1);
}

console.info("db:nuke: done");
