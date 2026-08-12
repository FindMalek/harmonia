import { describe, expect, it, vi } from "vitest";

vi.mock("@harmonia/db", () => ({ db: {} }));

import type { PipelineProgress } from "@harmonia/common/types";
import type { StageRate } from "../stage-timing";
import { estimateRemainingSeconds } from "../stage-timing";

const EMPTY_RATES = new Map<string, StageRate>();

describe("estimateRemainingSeconds", () => {
	it("returns null when there is no current stage", () => {
		const result = estimateRemainingSeconds({
			currentStage: null,
			progress: {},
			historicalRates: EMPTY_RATES,
		});
		expect(result).toBeNull();
	});

	it("returns null for an unrecognized stage (e.g. artists, not in the tracked order)", () => {
		const result = estimateRemainingSeconds({
			currentStage: "artists",
			progress: {},
			historicalRates: EMPTY_RATES,
		});
		expect(result).toBeNull();
	});

	it("returns null once past sync when the library track count is still unknown", () => {
		const result = estimateRemainingSeconds({
			currentStage: "classify",
			progress: {},
			historicalRates: EMPTY_RATES,
		});
		expect(result).toBeNull();
	});

	it("still estimates something while in the sync stage itself, even with no track count yet", () => {
		const result = estimateRemainingSeconds({
			currentStage: "sync",
			progress: {},
			historicalRates: EMPTY_RATES,
		});
		expect(result).not.toBeNull();
		expect(result).toBeGreaterThan(0);
	});

	it("uses cold-start fallback rates when there's no historical data", () => {
		const progress: PipelineProgress = {
			sync: { total: 100, done: true },
			classify: { classified: 40, total: 100, pending: 60 },
		};
		const result = estimateRemainingSeconds({
			currentStage: "classify",
			progress,
			historicalRates: EMPTY_RATES,
		});
		// 60 tracks remaining in classify (fallback 2s/track) + embed/cluster/generate/match/export flat+per-track fallbacks
		expect(result).not.toBeNull();
		expect(result).toBeGreaterThan(60 * 2); // at least the current stage's own remaining cost
	});

	it("prefers historical rates over the cold-start fallback when available", () => {
		const progress: PipelineProgress = {
			sync: { total: 100, done: true },
			classify: { classified: 50, total: 100, pending: 50 },
		};
		const fastHistorical = new Map<string, StageRate>([
			["classify", { kind: "per_track", secondsPerUnit: 0.1 }],
		]);
		const withFallback = estimateRemainingSeconds({
			currentStage: "classify",
			progress,
			historicalRates: EMPTY_RATES,
		});
		const withHistorical = estimateRemainingSeconds({
			currentStage: "classify",
			progress,
			historicalRates: fastHistorical,
		});
		expect(withHistorical).toBeLessThan(
			withFallback ?? Number.POSITIVE_INFINITY,
		);
	});

	it("computes remaining time in the current per-track stage from live progress, not the full total", () => {
		const progress: PipelineProgress = {
			sync: { total: 100, done: true },
			embed: { embedded: 90, total: 100, pending: 10 },
		};
		const rates = new Map<string, StageRate>([
			["embed", { kind: "per_track", secondsPerUnit: 1 }],
			["cluster", { kind: "flat", secondsPerUnit: 0 }],
			["generate", { kind: "flat", secondsPerUnit: 0 }],
			["match", { kind: "flat", secondsPerUnit: 0 }],
			["export", { kind: "flat", secondsPerUnit: 0 }],
		]);
		const result = estimateRemainingSeconds({
			currentStage: "embed",
			progress,
			historicalRates: rates,
		});
		// Only 10 tracks remain in embed (100 total - 90 embedded), at 1s/track = 10s;
		// every later stage's rate is zeroed out above, so the total should be exactly 10.
		expect(result).toBe(10);
	});

	it("includes every stage strictly after the current one", () => {
		const progress: PipelineProgress = {
			sync: { total: 10, done: true },
		};
		const rates = new Map<string, StageRate>([
			["lyrics", { kind: "per_track", secondsPerUnit: 0 }],
			["classify", { kind: "per_track", secondsPerUnit: 0 }],
			["embed", { kind: "per_track", secondsPerUnit: 0 }],
			["cluster", { kind: "flat", secondsPerUnit: 3 }],
			["generate", { kind: "flat", secondsPerUnit: 4 }],
			["match", { kind: "flat", secondsPerUnit: 5 }],
			["export", { kind: "flat", secondsPerUnit: 6 }],
		]);
		const result = estimateRemainingSeconds({
			currentStage: "sync",
			progress,
			historicalRates: rates,
		});
		// sync's own remaining (flat, halved) + cluster(3) + generate(4) + match(5) + export(6) = 18 + sync's own contribution
		expect(result).toBeGreaterThanOrEqual(18);
	});
});
