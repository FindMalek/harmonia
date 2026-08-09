import { describe, expect, it } from "vitest";

import { assessRunOutcome } from "../assess-run-outcome";

const HEALTHY_ARGS = {
	classify: undefined,
	embed: undefined,
	cluster: undefined,
	generate: undefined,
	stageFailures: [],
};

describe("assessRunOutcome", () => {
	it("reports completed when nothing was pending anywhere (healthy re-run)", () => {
		const result = assessRunOutcome({
			...HEALTHY_ARGS,
			classify: { classified: 0, total: 0 },
			embed: { embedded: 0, total: 0 },
			cluster: { clusters: 0, totalTracks: 0 },
			generate: { playlists: 0, tracksOrganized: 0 },
		});
		expect(result.status).toBe("completed");
		expect(result.error).toBeNull();
	});

	it("flags partial when clustering produced zero clusters despite having embedded tracks (#282)", () => {
		const result = assessRunOutcome({
			...HEALTHY_ARGS,
			classify: { classified: 0, total: 0 },
			embed: { embedded: 0, total: 0 },
			cluster: { clusters: 0, totalTracks: 25 },
			generate: { playlists: 0, tracksOrganized: 0 },
		});
		expect(result.status).toBe("partial");
		expect(result.error).toContain("no groups could be formed");
		expect(result.error).toContain("25 tracks analyzed");
	});

	it("does not flag partial when clustering succeeded, even with 0 totalTracks this run", () => {
		const result = assessRunOutcome({
			...HEALTHY_ARGS,
			cluster: { clusters: 5, totalTracks: 50 },
			generate: { playlists: 5, tracksOrganized: 50 },
		});
		expect(result.status).toBe("completed");
	});

	it("still flags a real classify coverage failure independent of clustering", () => {
		const result = assessRunOutcome({
			...HEALTHY_ARGS,
			classify: { classified: 0, total: 25 },
		});
		expect(result.status).toBe("partial");
		expect(result.error).toContain("classification failed (0 of 25");
	});

	it("still flags a real embed coverage failure independent of clustering", () => {
		const result = assessRunOutcome({
			...HEALTHY_ARGS,
			embed: { embedded: 3, total: 25 },
		});
		expect(result.status).toBe("partial");
		expect(result.error).toContain(
			"only 12% of classified tracks were embedded",
		);
	});

	it("does not double-report when both the cluster reason and the legacy zero-playlists guard would otherwise fire", () => {
		const result = assessRunOutcome({
			...HEALTHY_ARGS,
			classify: { classified: 25, total: 25 },
			cluster: { clusters: 0, totalTracks: 25 },
			generate: { playlists: 0, tracksOrganized: 0 },
		});
		expect(result.status).toBe("partial");
		const occurrences =
			result.error?.split("no groups could be formed").length ?? 0;
		expect(occurrences).toBe(2); // exactly one occurrence (split gives 2 parts)
		expect(result.error).not.toContain(
			"no playlists were generated despite classified tracks",
		);
	});

	it("still flags the legacy zero-playlists case when clustering itself succeeded but generation didn't", () => {
		const result = assessRunOutcome({
			...HEALTHY_ARGS,
			classify: { classified: 25, total: 25 },
			cluster: { clusters: 4, totalTracks: 25 },
			generate: { playlists: 0, tracksOrganized: 0 },
		});
		expect(result.status).toBe("partial");
		expect(result.error).toContain(
			"no playlists were generated despite classified tracks",
		);
	});

	it("always flags partial on a stage failure, regardless of coverage numbers", () => {
		const result = assessRunOutcome({
			...HEALTHY_ARGS,
			stageFailures: ["embed"],
		});
		expect(result.status).toBe("partial");
		expect(result.error).toContain("stage failure: embed");
	});
});
