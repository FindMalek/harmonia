import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { MIGRATION_FILENAME_RE } from "./types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const MIGRATIONS_DIR = path.join(__dirname, "migrations");

export function listMigrationFiles(migrationsDir = MIGRATIONS_DIR): string[] {
	if (!fs.existsSync(migrationsDir)) return [];
	return fs
		.readdirSync(migrationsDir)
		.filter((file) => MIGRATION_FILENAME_RE.test(file))
		.sort();
}

export function migrationNameFromFile(filename: string): string {
	return filename.replace(/\.ts$/, "");
}

export function migrationFilePath(
	filename: string,
	migrationsDir = MIGRATIONS_DIR,
): string {
	return path.join(migrationsDir, filename);
}

export function migrationImportUrl(
	filename: string,
	migrationsDir = MIGRATIONS_DIR,
): string {
	return pathToFileURL(migrationFilePath(filename, migrationsDir)).href;
}
