import { describe, expect, it } from "vitest";

import {
	assertValidMigrationSlug,
	parseMigrationName,
	toKebabCase,
} from "../lib/parse-migration-name";

describe("parseMigrationName", () => {
	it("reads the first arg when no pnpm separator", () => {
		expect(parseMigrationName(["node", "generate.ts", "hello-there"])).toBe(
			"hello-there",
		);
	});

	it("reads the arg after -- when pnpm passes a separator", () => {
		expect(
			parseMigrationName(["node", "generate.ts", "--", "hello-there"]),
		).toBe("hello-there");
	});

	it("returns undefined when name is missing", () => {
		expect(parseMigrationName(["node", "generate.ts"])).toBeUndefined();
		expect(parseMigrationName(["node", "generate.ts", "--"])).toBeUndefined();
	});
});

describe("toKebabCase", () => {
	it("normalizes snake_case and spaces", () => {
		expect(toKebabCase("backfill_cost_usd")).toBe("backfill-cost-usd");
		expect(toKebabCase("Hello There")).toBe("hello-there");
	});
});

describe("assertValidMigrationSlug", () => {
	it("accepts valid slugs", () => {
		expect(() => assertValidMigrationSlug("hello-there")).not.toThrow();
		expect(() => assertValidMigrationSlug("backfill-cost-usd")).not.toThrow();
	});

	it("rejects hyphen-only or empty slugs", () => {
		expect(() => assertValidMigrationSlug("--")).toThrow();
		expect(() => assertValidMigrationSlug("")).toThrow();
		expect(() => assertValidMigrationSlug("---")).toThrow();
	});
});
