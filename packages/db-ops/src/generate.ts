import fs from "node:fs";
import path from "node:path";
import {
	buildMigrationFileContent,
	formatMigrationTimestamp,
} from "./lib/migration-template";
import {
	assertValidMigrationSlug,
	parseMigrationName,
	toKebabCase,
} from "./lib/parse-migration-name";
import { MIGRATIONS_DIR } from "./migrations";

const rawName = parseMigrationName(process.argv);
if (!rawName) {
	console.error("Usage: pnpm db:ops:generate <migration-name>");
	console.error("Example: pnpm db:ops:generate backfill-cost-usd");
	process.exit(1);
}

let kebab: string;
try {
	kebab = toKebabCase(rawName);
	assertValidMigrationSlug(kebab);
} catch (err) {
	console.error(err instanceof Error ? err.message : err);
	process.exit(1);
}

const createdAt = new Date();
const timestamp = formatMigrationTimestamp(createdAt);
const filename = `${timestamp}-${kebab}.ts`;
const filePath = path.join(MIGRATIONS_DIR, filename);

if (!fs.existsSync(MIGRATIONS_DIR)) {
	fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
}

if (fs.existsSync(filePath)) {
	console.error(`db-ops:generate: file already exists: ${filePath}`);
	process.exit(1);
}

const template = buildMigrationFileContent({
	slug: kebab,
	filename,
	createdAt,
});
fs.writeFileSync(filePath, template, "utf-8");
console.info(`Created ${filePath}`);
