import fs from "node:fs";
import path from "node:path";

import { MIGRATIONS_DIR } from "./migrations";

function formatTimestamp(date: Date): string {
	const pad = (n: number, len = 2) => String(n).padStart(len, "0");
	return (
		String(date.getUTCFullYear()) +
		pad(date.getUTCMonth() + 1) +
		pad(date.getUTCDate()) +
		pad(date.getUTCHours()) +
		pad(date.getUTCMinutes()) +
		pad(date.getUTCSeconds())
	);
}

function toKebabCase(name: string): string {
	return name
		.trim()
		.replace(/[_\s]+/g, "-")
		.replace(/[^a-zA-Z0-9-]/g, "")
		.toLowerCase();
}

const rawName = process.argv[2];
if (!rawName) {
	console.error("Usage: pnpm db:ops:generate <migration-name>");
	process.exit(1);
}

const kebab = toKebabCase(rawName);
if (!kebab) {
	console.error(
		"db-ops:generate: migration name must contain letters or numbers",
	);
	process.exit(1);
}

const timestamp = formatTimestamp(new Date());
const filename = `${timestamp}-${kebab}.ts`;
const filePath = path.join(MIGRATIONS_DIR, filename);

if (!fs.existsSync(MIGRATIONS_DIR)) {
	fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
}

const template = `import type { DbOpsContext } from "../types";

export async function up({ db, log }: DbOpsContext): Promise<void> {
	void db;
	void log;
}
`;

fs.writeFileSync(filePath, template, "utf-8");
console.info(`Created ${filePath}`);
