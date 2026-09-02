import { describe, expect, it } from "vitest";

import { isUndefinedTableError, resolveMigrationAction } from "../ledger";

const NOW = new Date("2026-08-28T12:00:00.000Z");
const STALE_MS = 30 * 60 * 1000;
const CHECKSUM = "abc123";

describe("resolveMigrationAction", () => {
	it("runs when no ledger row exists", () => {
		expect(resolveMigrationAction(null, CHECKSUM, NOW, STALE_MS)).toBe("run");
	});

	it("skips completed migrations with matching checksum", () => {
		expect(
			resolveMigrationAction(
				{
					status: "completed",
					checksum: CHECKSUM,
					startedAt: NOW,
				},
				CHECKSUM,
				NOW,
				STALE_MS,
			),
		).toBe("skip");
	});

	it("fails checksum mismatch on completed migrations", () => {
		expect(
			resolveMigrationAction(
				{
					status: "completed",
					checksum: "old",
					startedAt: NOW,
				},
				CHECKSUM,
				NOW,
				STALE_MS,
			),
		).toBe("checksum_mismatch");
	});

	it("retries failed migrations", () => {
		expect(
			resolveMigrationAction(
				{
					status: "failed",
					checksum: CHECKSUM,
					startedAt: NOW,
				},
				CHECKSUM,
				NOW,
				STALE_MS,
			),
		).toBe("run");
	});

	it("aborts fresh running migrations", () => {
		expect(
			resolveMigrationAction(
				{
					status: "running",
					checksum: CHECKSUM,
					startedAt: new Date(NOW.getTime() - 5 * 60 * 1000),
				},
				CHECKSUM,
				NOW,
				STALE_MS,
			),
		).toBe("abort_in_progress");
	});

	it("retries stale running migrations", () => {
		expect(
			resolveMigrationAction(
				{
					status: "running",
					checksum: CHECKSUM,
					startedAt: new Date(NOW.getTime() - 31 * 60 * 1000),
				},
				CHECKSUM,
				NOW,
				STALE_MS,
			),
		).toBe("run");
	});
});

describe("isUndefinedTableError", () => {
	it("matches a bare pg error with code 42P01", () => {
		expect(isUndefinedTableError({ code: "42P01" })).toBe(true);
	});

	it("matches a DrizzleQueryError wrapping the pg error in .cause", () => {
		// drizzle-orm wraps the underlying pg driver error instead of
		// surfacing its `code` directly on the thrown error.
		expect(
			isUndefinedTableError({
				message: "Failed query",
				cause: { code: "42P01" },
			}),
		).toBe(true);
	});

	it("does not match an unrelated error code", () => {
		expect(isUndefinedTableError({ code: "23505" })).toBe(false);
	});

	it("does not match non-object values", () => {
		expect(isUndefinedTableError(null)).toBe(false);
		expect(isUndefinedTableError("boom")).toBe(false);
		expect(isUndefinedTableError(undefined)).toBe(false);
	});
});
