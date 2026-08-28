import { describe, expect, it } from "vitest";

import { resolveMigrationAction } from "../ledger";

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
