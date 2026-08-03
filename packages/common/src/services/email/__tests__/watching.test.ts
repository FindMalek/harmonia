import { describe, expect, it } from "vitest";

import { wasStillWatching } from "../watching";

const THRESHOLD_MS = 45_000;
const completedAt = new Date("2026-01-01T00:01:00.000Z");

describe("wasStillWatching", () => {
	it("is false for a cron run regardless of heartbeat recency", () => {
		expect(
			wasStillWatching({
				triggeredBy: "cron",
				completedAt,
				lastClientSeenAt: completedAt,
				awayThresholdMs: THRESHOLD_MS,
			}),
		).toBe(false);
	});

	it("is false when no heartbeat was ever recorded", () => {
		expect(
			wasStillWatching({
				triggeredBy: "user",
				completedAt,
				lastClientSeenAt: null,
				awayThresholdMs: THRESHOLD_MS,
			}),
		).toBe(false);
	});

	it("is false when the run never actually completed", () => {
		expect(
			wasStillWatching({
				triggeredBy: "user",
				completedAt: null,
				lastClientSeenAt: completedAt,
				awayThresholdMs: THRESHOLD_MS,
			}),
		).toBe(false);
	});

	it("is true when the last heartbeat landed well within the threshold", () => {
		const lastClientSeenAt = new Date(completedAt.getTime() - 10_000);
		expect(
			wasStillWatching({
				triggeredBy: "user",
				completedAt,
				lastClientSeenAt,
				awayThresholdMs: THRESHOLD_MS,
			}),
		).toBe(true);
	});

	it("is false when the last heartbeat is older than the threshold", () => {
		const lastClientSeenAt = new Date(completedAt.getTime() - 60_000);
		expect(
			wasStillWatching({
				triggeredBy: "user",
				completedAt,
				lastClientSeenAt,
				awayThresholdMs: THRESHOLD_MS,
			}),
		).toBe(false);
	});

	it("is false exactly at the threshold boundary (strictly less-than)", () => {
		const lastClientSeenAt = new Date(completedAt.getTime() - THRESHOLD_MS);
		expect(
			wasStillWatching({
				triggeredBy: "user",
				completedAt,
				lastClientSeenAt,
				awayThresholdMs: THRESHOLD_MS,
			}),
		).toBe(false);
	});
});
