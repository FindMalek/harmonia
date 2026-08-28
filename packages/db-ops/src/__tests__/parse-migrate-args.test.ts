import { describe, expect, it } from "vitest";

import {
	filterFilesByOnly,
	parseDatabaseHost,
	parseMigrateArgs,
	resolveMigrationFileByOnly,
} from "../lib/parse-migrate-args";
import { shouldRunMigration } from "../lib/should-run-migration";

describe("parseMigrateArgs", () => {
	it("parses --dry-run and --only after pnpm separator", () => {
		expect(
			parseMigrateArgs([
				"node",
				"migrate.ts",
				"--",
				"--dry-run",
				"--only",
				"backfill-cost-usd",
			]),
		).toEqual({ dryRun: true, only: "backfill-cost-usd" });
	});

	it("parses flags without separator", () => {
		expect(
			parseMigrateArgs(["node", "migrate.ts", "--dry-run", "--only", "hello"]),
		).toEqual({ dryRun: true, only: "hello" });
	});

	it("defaults to apply mode", () => {
		expect(parseMigrateArgs(["node", "migrate.ts"])).toEqual({
			dryRun: false,
			only: undefined,
		});
	});
});

describe("parseDatabaseHost", () => {
	it("extracts host from a database URL", () => {
		expect(parseDatabaseHost("postgres://user:pass@localhost:5433/db")).toBe(
			"localhost:5433",
		);
	});
});

describe("resolveMigrationFileByOnly", () => {
	it("matches slug suffix", () => {
		const file = resolveMigrationFileByOnly("backfill-cost-usd");
		expect(file).toBe("20260828120000-backfill-cost-usd.ts");
	});

	it("matches full migration name", () => {
		const file = resolveMigrationFileByOnly("20260828120000-backfill-cost-usd");
		expect(file).toBe("20260828120000-backfill-cost-usd.ts");
	});
});

describe("filterFilesByOnly", () => {
	it("throws when no migration matches", () => {
		expect(() => filterFilesByOnly([], "missing")).toThrow(
			/no migration matches/,
		);
	});
});

describe("shouldRunMigration", () => {
	it("skips completed unless dry-run with --only target", () => {
		expect(
			shouldRunMigration("skip", { dryRun: false, isOnlyTarget: false }),
		).toBe(false);
		expect(
			shouldRunMigration("skip", { dryRun: true, isOnlyTarget: true }),
		).toBe(true);
		expect(
			shouldRunMigration("skip", { dryRun: true, isOnlyTarget: false }),
		).toBe(false);
	});

	it("runs pending migrations", () => {
		expect(
			shouldRunMigration("run", { dryRun: false, isOnlyTarget: false }),
		).toBe(true);
	});
});
