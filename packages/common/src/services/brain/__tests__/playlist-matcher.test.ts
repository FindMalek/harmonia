import { describe, expect, it } from "vitest";

import {
	jaccardSimilarity,
	matchClustersToPlaylists,
} from "../playlist-matcher";

function ids(...n: number[]): Set<string> {
	return new Set(n.map((i) => `t${i}`));
}

describe("jaccardSimilarity", () => {
	it("is 1 for two empty sets", () => {
		expect(jaccardSimilarity(new Set(), new Set())).toBe(1);
	});

	it("is 0 for disjoint sets", () => {
		expect(jaccardSimilarity(ids(1, 2, 3), ids(4, 5, 6))).toBe(0);
	});

	it("is 1 for identical sets", () => {
		expect(jaccardSimilarity(ids(1, 2, 3), ids(1, 2, 3))).toBe(1);
	});

	it("computes partial overlap correctly", () => {
		// {1,2,3,4} vs {3,4,5,6} -> intersection 2, union 6
		expect(jaccardSimilarity(ids(1, 2, 3, 4), ids(3, 4, 5, 6))).toBeCloseTo(
			2 / 6,
		);
	});

	it("penalizes asymmetric size where overlap-coefficient would not", () => {
		// A 10-track cluster sharing 8 tracks with an unrelated 75-track playlist
		// scores LOW under Jaccard (correctly, since 67 of the playlist's tracks
		// are unrelated), even though overlap-coefficient (8/min(10,75)=0.8)
		// would misleadingly call this a strong match.
		const cluster = ids(...Array.from({ length: 10 }, (_, i) => i));
		const bigUnrelatedPlaylist = ids(
			...Array.from({ length: 75 }, (_, i) => (i < 8 ? i : i + 100)),
		);
		const similarity = jaccardSimilarity(cluster, bigUnrelatedPlaylist);
		// intersection=8, union=10+75-8=77
		expect(similarity).toBeCloseTo(8 / 77);
		expect(similarity).toBeLessThan(0.15);
	});
});

describe("matchClustersToPlaylists", () => {
	it("returns no matches when there are no existing playlists (first run)", () => {
		const clusters = [{ clusterIndex: 0, trackIds: ids(1, 2, 3) }];
		expect(matchClustersToPlaylists(clusters, [], 0.5)).toEqual([]);
	});

	it("matches a cluster with high overlap to its prior playlist", () => {
		// old playlist 60 tracks, new cluster is 58 of those + 2 new ones
		const oldIds = Array.from({ length: 60 }, (_, i) => i);
		const newIds = [...oldIds.slice(0, 58), 1000, 1001];
		const clusters = [{ clusterIndex: 0, trackIds: ids(...newIds) }];
		const playlists = [{ playlistId: 42, trackIds: ids(...oldIds) }];

		const matches = matchClustersToPlaylists(clusters, playlists, 0.5);
		expect(matches).toHaveLength(1);
		expect(matches[0]).toMatchObject({ clusterIndex: 0, playlistId: 42 });
		expect(matches[0]?.similarity).toBeGreaterThan(0.9);
	});

	it("does not match when overlap is below threshold (genuinely new cluster)", () => {
		const clusters = [{ clusterIndex: 0, trackIds: ids(1, 2, 3, 4, 5) }];
		const playlists = [{ playlistId: 1, trackIds: ids(100, 101, 102) }];
		expect(matchClustersToPlaylists(clusters, playlists, 0.5)).toEqual([]);
	});

	it("resolves a clean 50/50 split deterministically by larger absolute overlap", () => {
		// Old playlist of 80 tracks splits into two new clusters of 40 each.
		// Both have similarity 0.5 against the old playlist (subset relationship:
		// intersection=40, union=80). Larger cluster should win the tie.
		const oldIds = Array.from({ length: 80 }, (_, i) => i);
		const clusterA = { clusterIndex: 0, trackIds: ids(...oldIds.slice(0, 40)) };
		const clusterB = {
			clusterIndex: 1,
			trackIds: ids(...oldIds.slice(40, 80)),
		};
		const playlists = [{ playlistId: 1, trackIds: ids(...oldIds) }];

		const matches = matchClustersToPlaylists(
			[clusterA, clusterB],
			playlists,
			0.5,
		);
		// Both have identical similarity AND identical intersection size (40 vs 40)
		// in this perfectly even split - so the final tie-break (clusterIndex) applies.
		expect(matches).toHaveLength(1);
		expect(matches[0]?.clusterIndex).toBe(0);
		expect(matches[0]?.playlistId).toBe(1);
		// Re-running with the same input must produce the same result (determinism).
		const rerun = matchClustersToPlaylists(
			[clusterA, clusterB],
			playlists,
			0.5,
		);
		expect(rerun).toEqual(matches);
	});

	it("prefers the cluster with larger absolute overlap on an uneven split", () => {
		const oldIds = Array.from({ length: 80 }, (_, i) => i);
		const bigHalf = { clusterIndex: 0, trackIds: ids(...oldIds.slice(0, 50)) };
		const smallHalf = {
			clusterIndex: 1,
			trackIds: ids(...oldIds.slice(50, 80)),
		};
		const playlists = [{ playlistId: 1, trackIds: ids(...oldIds) }];

		// bigHalf: intersection=50, union=80 -> 0.625
		// smallHalf: intersection=30, union=80 -> 0.375
		const matches = matchClustersToPlaylists(
			[smallHalf, bigHalf],
			playlists,
			0.3,
		);
		expect(matches).toHaveLength(1);
		expect(matches[0]?.clusterIndex).toBe(0); // bigHalf wins on higher similarity
	});

	it("assigns greedily so no cluster or playlist is matched twice", () => {
		const clusterA = { clusterIndex: 0, trackIds: ids(1, 2, 3, 4) };
		const clusterB = { clusterIndex: 1, trackIds: ids(1, 2, 3, 5) };
		const playlistX = { playlistId: 10, trackIds: ids(1, 2, 3, 4) }; // identical to A
		const playlistY = { playlistId: 20, trackIds: ids(1, 2, 3, 6) };

		const matches = matchClustersToPlaylists(
			[clusterA, clusterB],
			[playlistX, playlistY],
			0.3,
		);

		const usedClusters = new Set(matches.map((m) => m.clusterIndex));
		const usedPlaylists = new Set(matches.map((m) => m.playlistId));
		expect(usedClusters.size).toBe(matches.length);
		expect(usedPlaylists.size).toBe(matches.length);
		// clusterA <-> playlistX is the strongest pair (identical sets) and must win
		expect(
			matches.some((m) => m.clusterIndex === 0 && m.playlistId === 10),
		).toBe(true);
	});

	it("leaves an existing playlist unmatched (orphaned) when no cluster is close enough", () => {
		const clusters = [{ clusterIndex: 0, trackIds: ids(1, 2, 3) }];
		const playlists = [
			{ playlistId: 1, trackIds: ids(1, 2, 3) },
			{ playlistId: 2, trackIds: ids(100, 101, 102) }, // no matching cluster this run
		];
		const matches = matchClustersToPlaylists(clusters, playlists, 0.5);
		expect(matches).toHaveLength(1);
		expect(matches[0]?.playlistId).toBe(1);
	});
});
