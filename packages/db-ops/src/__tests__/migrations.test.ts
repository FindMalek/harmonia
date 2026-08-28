import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { listMigrationFiles, migrationNameFromFile } from "../migrations";

const tempDirs: string[] = [];

afterEach(() => {
	for (const dir of tempDirs) {
		fs.rmSync(dir, { recursive: true, force: true });
	}
	tempDirs.length = 0;
});

function makeTempMigrationsDir(files: string[]): string {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "db-ops-migrations-"));
	tempDirs.push(dir);
	for (const file of files) {
		fs.writeFileSync(path.join(dir, file), "export async function up() {}\n");
	}
	return dir;
}

describe("listMigrationFiles", () => {
	it("returns migration files in lexicographic order", () => {
		const dir = makeTempMigrationsDir([
			"20260828120001-second.ts",
			"20260828120000-first.ts",
			"README.md",
			"bad-name.ts",
		]);
		expect(listMigrationFiles(dir)).toEqual([
			"20260828120000-first.ts",
			"20260828120001-second.ts",
		]);
	});

	it("returns empty array when directory is missing", () => {
		expect(listMigrationFiles("/tmp/does-not-exist-db-ops")).toEqual([]);
	});
});

describe("migrationNameFromFile", () => {
	it("strips the .ts extension", () => {
		expect(migrationNameFromFile("20260828120000-backfill-cost-usd.ts")).toBe(
			"20260828120000-backfill-cost-usd",
		);
	});
});
