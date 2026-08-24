import { describe, expect, it, vi } from "vitest";

vi.mock("@harmonia/db", () => ({ db: {} }));

import {
	computeAutoEpsilon,
	kmeans,
	mergeSmallClusters,
	splitLargeClusters,
} from "../clustering";

function totalIndices(clusters: number[][]): number[] {
	return clusters.flat().sort((a, b) => a - b);
}

describe("mergeSmallClusters", () => {
	it("merges a small cluster into the nearest large cluster by centroid", () => {
		const embeddings: number[][] = [];
		embeddings[0] = [0];
		embeddings[1] = [0.1];
		embeddings[2] = [0.2];
		embeddings[5] = [100];
		embeddings[6] = [100.1];
		embeddings[7] = [100.2];
		embeddings[8] = [99];

		const result = mergeSmallClusters(
			[[0, 1, 2], [5, 6, 7], [8]],
			embeddings,
			3,
		);

		expect(result).toHaveLength(2);
		expect(result).toContainEqual([0, 1, 2]);
		expect(result).toContainEqual([5, 6, 7, 8]);
	});

	it("merges clusters together when none reaches minSize on its own (issue #204)", () => {
		const embeddings: number[][] = Array.from({ length: 12 }, (_, i) => [i]);

		const result = mergeSmallClusters(
			[
				[0, 1, 2],
				[3, 4, 5],
				[6, 7, 8],
				[9, 10, 11],
			],
			embeddings,
			8,
		);

		// Every original index must still be present exactly once, and no
		// output cluster count exceeds the input's — nothing was dropped or
		// duplicated by the recursive merge.
		expect(totalIndices(result)).toEqual(
			Array.from({ length: 12 }, (_, i) => i),
		);
		expect(result.length).toBeLessThan(4);
	});

	it("bottoms out at a single cluster when the whole library is below minSize", () => {
		const embeddings: number[][] = Array.from({ length: 5 }, (_, i) => [i]);

		const result = mergeSmallClusters([[0, 1], [2, 3], [4]], embeddings, 20);

		expect(result).toHaveLength(1);
		expect(totalIndices(result)).toEqual([0, 1, 2, 3, 4]);
	});

	it("is a no-op for a single input cluster", () => {
		const embeddings: number[][] = [[0], [1]];
		expect(mergeSmallClusters([[0, 1]], embeddings, 10)).toEqual([[0, 1]]);
	});
});

describe("kmeans", () => {
	it("separates two well-separated groups (DBSCAN-fallback use case, #282)", () => {
		const embeddings: number[][] = [
			[0, 0],
			[0.1, 0],
			[0, 0.1],
			[10, 10],
			[10.1, 10],
			[10, 10.1],
		];

		const result = kmeans(embeddings, 2);

		expect(totalIndices(result)).toEqual([0, 1, 2, 3, 4, 5]);
		const groupWithZero = result.find((c) => c.includes(0));
		expect(groupWithZero).toEqual(expect.arrayContaining([0, 1, 2]));
		expect(groupWithZero).toHaveLength(3);
	});

	it("clamps k to the number of points when k exceeds n", () => {
		const embeddings: number[][] = [
			[0, 0],
			[1, 1],
			[2, 2],
		];
		const result = kmeans(embeddings, 10);
		expect(totalIndices(result)).toEqual([0, 1, 2]);
		expect(result.length).toBeLessThanOrEqual(3);
	});

	it("returns empty for empty input", () => {
		expect(kmeans([], 3)).toEqual([]);
	});

	it("never drops or duplicates a point across output buckets", () => {
		const embeddings: number[][] = Array.from({ length: 25 }, (_, i) => [
			i % 5,
			Math.floor(i / 5),
		]);
		const result = kmeans(embeddings, 3);
		expect(totalIndices(result)).toEqual(
			Array.from({ length: 25 }, (_, i) => i),
		);
	});
});

describe("splitLargeClusters", () => {
	it("leaves clusters at or under maxSize untouched", () => {
		const embeddings: number[][] = Array.from({ length: 10 }, (_, i) => [i]);
		const cluster = Array.from({ length: 10 }, (_, i) => i);
		expect(splitLargeClusters([cluster], embeddings, 80, 5)).toEqual([cluster]);
	});

	it("guarantees no output bucket exceeds maxSize even in a worst-case split (issue #204)", () => {
		// All embeddings identical: DBSCAN/k-means can't meaningfully separate
		// them, forcing the max-recursion-depth fallback path.
		const size = 200;
		const maxSize = 80;
		const embeddings: number[][] = Array.from({ length: size }, () => [0]);
		const cluster = Array.from({ length: size }, (_, i) => i);

		const result = splitLargeClusters([cluster], embeddings, maxSize, 5);

		for (const bucket of result) {
			expect(bucket.length).toBeLessThanOrEqual(maxSize);
		}
		expect(totalIndices(result)).toEqual(
			Array.from({ length: size }, (_, i) => i),
		);
	});
});

describe("computeAutoEpsilon", () => {
	const FALLBACK_EPSILON = 0.3;

	it("falls back to the fixed constant when there aren't enough points for a k-distance", () => {
		// n <= minPts: no point can have a 5th-nearest neighbour.
		const embeddings: number[][] = Array.from({ length: 5 }, (_, i) => [i]);
		expect(computeAutoEpsilon(embeddings, 5)).toBe(FALLBACK_EPSILON);
	});

	it("picks a smaller epsilon for a tightly-clustered library than an eclectic one", () => {
		const tight: number[][] = Array.from({ length: 30 }, (_, i) => [i * 0.01]);
		const eclectic: number[][] = Array.from({ length: 30 }, (_, i) => [i * 10]);

		const tightEps = computeAutoEpsilon(tight, 5);
		const eclecticEps = computeAutoEpsilon(eclectic, 5);

		expect(tightEps).toBeLessThan(eclecticEps);
	});

	it("is deterministic — same input always yields the same output", () => {
		const embeddings: number[][] = Array.from({ length: 50 }, (_, i) => [
			Math.sin(i),
			Math.cos(i),
		]);
		const first = computeAutoEpsilon(embeddings, 5);
		const second = computeAutoEpsilon(embeddings, 5);
		expect(first).toBe(second);
	});

	it("stays correct when sampling kicks in on a library larger than the sample cap", () => {
		const embeddings: number[][] = Array.from({ length: 40 }, (_, i) => [
			i * 0.05,
		]);
		// maxSample smaller than n forces the step-sampling path.
		const eps = computeAutoEpsilon(embeddings, 5, 10, 10);
		expect(eps).toBeGreaterThan(0);
		expect(Number.isFinite(eps)).toBe(true);
	});

	it("does not crash on fully identical points and returns a sane value", () => {
		const embeddings: number[][] = Array.from({ length: 20 }, () => [0, 0]);
		const eps = computeAutoEpsilon(embeddings, 5);
		// Every k-distance is 0 for identical points — falls back rather
		// than handing DBSCAN a useless eps of 0.
		expect(eps).toBe(FALLBACK_EPSILON);
	});
});
