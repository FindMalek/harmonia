import type { ClusterProgress } from "@harmonia/common/types";
import { db } from "@harmonia/db";
import { cluster, clusterTracks } from "@harmonia/db/schema/cluster";
import { genreDomain } from "@harmonia/db/schema/genre-domain";
import { track, userTracks } from "@harmonia/db/schema/track";
import { logger } from "@harmonia/logger";
import Clustering from "density-clustering";
import { and, eq, inArray, isNotNull } from "drizzle-orm";

import {
	CLUSTER_EPSILON,
	CLUSTER_MAX_SIZE,
	CLUSTER_MAX_SPLIT_DEPTH,
	CLUSTER_MIN_POINTS,
	CLUSTER_MIN_SIZE,
} from "../../constants/brain";

export async function runClustering(
	userId: string,
	onProgress?: (progress: ClusterProgress) => Promise<void>,
): Promise<ClusterProgress> {
	const stats: ClusterProgress = { clusters: 0, noise: 0, totalTracks: 0 };

	const userTrackIds = db
		.select({ trackId: userTracks.trackId })
		.from(userTracks)
		.where(eq(userTracks.userId, userId));

	const tracks = await db
		.select()
		.from(track)
		.where(and(inArray(track.id, userTrackIds), isNotNull(track.embedding)));

	if (tracks.length === 0) {
		logger.info({ userId }, "No tracks with embeddings; skipping clustering");
		return stats;
	}

	stats.totalTracks = tracks.length;

	// L2-normalise embeddings in-memory so DBSCAN's Euclidean distance is
	// equivalent to cosine distance (the metric text-embedding-3-small is
	// designed for). The DB column stores raw vectors; we never mutate it —
	// normalisation is a read-time transform local to clustering.
	const embeddings = tracks.map((t) => l2Normalize(requireEmbedding(t.embedding)));

	if (embeddings.length < CLUSTER_MIN_POINTS) {
		logger.info(
			{ userId, count: embeddings.length },
			"Not enough tracks for clustering; skipping",
		);
		return stats;
	}

	type DBSCANModule = {
		DBSCAN: new () => {
			run: (data: number[][], eps: number, minPts: number) => number[][];
			noise: number[];
		};
	};
	const dbscan = new (Clustering as DBSCANModule).DBSCAN();
	const rawClusters = dbscan.run(
		embeddings,
		CLUSTER_EPSILON,
		CLUSTER_MIN_POINTS,
	) as number[][];

	stats.noise = dbscan.noise?.length ?? 0;

	if (!rawClusters.length) {
		logger.info({ userId }, "DBSCAN produced no clusters");
		return stats;
	}

	const mergedClusters = mergeSmallClusters(
		rawClusters,
		embeddings,
		CLUSTER_MIN_SIZE,
	);
	const finalClusters = splitLargeClusters(
		mergedClusters,
		embeddings,
		CLUSTER_MAX_SIZE,
		CLUSTER_MIN_POINTS,
	);

	// Sanity log: clusters/tracks ratio + size spread. Makes regressions in
	// cluster granularity immediately visible in Trigger.dev logs (issue #111).
	logClusterSanity(userId, stats.totalTracks, finalClusters);

	await db.delete(cluster).where(eq(cluster.userId, userId));

	const defaultGenreDomainId = await ensureDefaultGenreDomain();

	for (const indices of finalClusters) {
		if (indices.length === 0) continue;

		const clusterTracksForUser = indices
			.map((index) => tracks[index])
			.filter((t): t is (typeof tracks)[number] => t != null);

		if (clusterTracksForUser.length === 0) continue;

		const size = clusterTracksForUser.length;

		// Centroid is the mean of the member embeddings in the SAME normalised
		// space the cluster was formed in, so downstream cosine matching against
		// `cluster.centroid` (track-matcher) is consistent with how clusters group.
		const centroid = computeCentroid(
			indices.map((i) => embeddings[i] as number[]),
		);

		const avgValence = average(
			clusterTracksForUser.map((t) => t.valence ?? null),
		);
		const avgEnergy = average(
			clusterTracksForUser.map((t) => t.energy ?? null),
		);
		const avgTempo = average(clusterTracksForUser.map((t) => t.tempo ?? null));

		const genreDomainId = chooseDominantDomain(
			clusterTracksForUser.map((t) => t.genreDomainId ?? null),
		);

		const [inserted] = await db
			.insert(cluster)
			.values({
				userId,
				genreDomainId: genreDomainId ?? defaultGenreDomainId,
				centroid,
				size,
				avgValence,
				avgEnergy,
				avgTempo,
			})
			.returning({ id: cluster.id });

		if (!inserted) continue;

		const clusterId = inserted.id;

		const joinRows = clusterTracksForUser.map((t, position) => ({
			clusterId,
			trackId: t.id,
			position,
		}));

		if (joinRows.length > 0) {
			await db.insert(clusterTracks).values(joinRows);
		}

		stats.clusters++;
	}

	if (onProgress) {
		await onProgress(stats);
	}

	logger.info(
		{ userId, clusters: stats.clusters, noise: stats.noise },
		"Completed clustering for user tracks",
	);

	return stats;
}

function mergeSmallClusters(
	clusters: number[][],
	embeddings: number[][],
	minSize: number,
): number[][] {
	const large: number[][] = [];
	const small: number[][] = [];

	for (const c of clusters) {
		if (c.length >= minSize) {
			large.push([...c]);
		} else {
			small.push(c);
		}
	}

	if (large.length === 0) return clusters;

	const centroids = large.map((indices) =>
		computeCentroid(indices.map((i) => embeddings[i] as number[])),
	);

	for (const smallCluster of small) {
		const smallCentroid = computeCentroid(
			smallCluster.map((i) => embeddings[i] as number[]),
		);
		let bestIdx = 0;
		let bestDist = Number.POSITIVE_INFINITY;
		for (let i = 0; i < centroids.length; i++) {
			const dist = euclideanDistance(smallCentroid, centroids[i] as number[]);
			if (dist < bestDist) {
				bestDist = dist;
				bestIdx = i;
			}
		}
		large[bestIdx]?.push(...smallCluster);
	}

	return large;
}

function splitLargeClusters(
	clusters: number[][],
	embeddings: number[][],
	maxSize: number,
	minPoints: number,
	depth = 0,
): number[][] {
	const result: number[][] = [];

	for (const indices of clusters) {
		if (indices.length <= maxSize) {
			result.push(indices);
			continue;
		}

		const subEmbeddings = indices.map((i) => embeddings[i] as number[]);
		type DBSCANModule = {
			DBSCAN: new () => {
				run: (data: number[][], eps: number, minPts: number) => number[][];
			};
		};
		const dbscan = new (Clustering as DBSCANModule).DBSCAN();
		const subClusters = dbscan.run(
			subEmbeddings,
			CLUSTER_EPSILON * 0.7,
			minPoints,
		) as number[][];

		// First attempt: re-run DBSCAN at a tighter epsilon on the mega-cluster.
		// Fallback: DBSCAN couldn't split it (single dense blob at the tighter
		// epsilon) — force-split by k-means into enough parts to get under maxSize.
		const candidates =
			subClusters.length > 1
				? subClusters.map((sub) => sub.map((si) => indices[si] as number))
				: kmeans(subEmbeddings, Math.max(2, Math.ceil(indices.length / maxSize)))
						.filter((sub) => sub.length > 0)
						.map((sub) => sub.map((si) => indices[si] as number));

		// Neither DBSCAN nor k-means guarantees every resulting bucket is under
		// maxSize (a sub-cluster can itself be a mega-cluster; k-means buckets
		// can be imbalanced) — issue #111's original bug. Recursively re-split
		// any bucket still oversized, bounded so pathological input (e.g.
		// near-identical embeddings that never separate) can't recurse forever.
		if (depth >= CLUSTER_MAX_SPLIT_DEPTH) {
			result.push(...candidates);
			continue;
		}
		result.push(
			...splitLargeClusters(candidates, embeddings, maxSize, minPoints, depth + 1),
		);
	}

	return result;
}

/**
 * Narrows `track.embedding` (nullable in the column type) to `number[]`.
 * Callers only ever pass rows from a query filtered by `isNotNull(track.embedding)`,
 * so a null here means that invariant broke — fail loudly instead of silently
 * casting past it.
 */
function requireEmbedding(embedding: number[] | null): number[] {
	if (!embedding) {
		throw new Error("Expected non-null track.embedding after isNotNull filter");
	}
	return embedding;
}

function computeCentroid(vectors: number[][]): number[] {
	if (vectors.length === 0) return [];

	const dimension = vectors[0]?.length ?? 0;
	const sums = new Array<number>(dimension).fill(0);

	for (const vector of vectors) {
		for (let index = 0; index < dimension; index++) {
			sums[index] = (sums[index] ?? 0) + (vector[index] ?? 0);
		}
	}

	return sums.map((sum) => sum / vectors.length);
}

function euclideanDistance(a: number[], b: number[]): number {
	let sum = 0;
	for (let i = 0; i < a.length; i++) {
		const diff = (a[i] ?? 0) - (b[i] ?? 0);
		sum += diff * diff;
	}
	return Math.sqrt(sum);
}

/**
 * Scale a vector to unit length. For unit vectors, Euclidean distance is
 * equivalent to cosine distance (‖a−b‖² = 2 − 2·cos(θ)), which is the metric
 * `text-embedding-3-small` is designed to be compared with. A zero vector is
 * returned unchanged (cannot be normalised).
 */
function l2Normalize(vector: number[]): number[] {
	let norm = 0;
	for (let i = 0; i < vector.length; i++) {
		const c = vector[i] ?? 0;
		norm += c * c;
	}
	norm = Math.sqrt(norm);
	if (norm === 0) return vector.slice();
	const out = new Array<number>(vector.length);
	for (let i = 0; i < vector.length; i++) {
		out[i] = (vector[i] ?? 0) / norm;
	}
	return out;
}

/**
 * Deterministic k-means used only as a fallback to force-split a mega-cluster
 * DBSCAN couldn't separate (issue #111). Seeding is k-means++-style farthest-
 * first (no RNG) so clustering stays reproducible run-to-run.
 *
 * Operates on already-normalised vectors; Euclidean assignment is therefore
 * cosine-consistent. Returns arrays of indices into the input `vectors`.
 */
function kmeans(vectors: number[][], k: number, iterations = 12): number[][] {
	const n = vectors.length;
	if (n === 0) return [];
	const effectiveK = Math.min(k, n);

	const firstVector = vectors[0];
	if (!firstVector) return [];

	// --- k-means++ seeding (deterministic: first point, then farthest-first) ---
	const centroids: number[][] = [firstVector];
	const nearest = vectors.map((v) => euclideanDistance(v, firstVector) ** 2);
	while (centroids.length < effectiveK) {
		let pick = 0;
		let best = -1;
		for (let i = 0; i < n; i++) {
			const dist = nearest[i] ?? 0;
			if (dist > best) {
				best = dist;
				pick = i;
			}
		}
		// If every remaining point coincides with an existing centroid, stop
		// adding centroids — duplicates would only yield empty clusters.
		if (best <= 1e-9) break;
		const chosen = vectors[pick];
		if (!chosen) break;
		centroids.push(chosen);
		for (let i = 0; i < n; i++) {
			const v = vectors[i];
			if (!v) continue;
			const d = euclideanDistance(v, chosen) ** 2;
			if (d < (nearest[i] ?? Number.POSITIVE_INFINITY)) nearest[i] = d;
		}
	}

	const dim = (centroids[0] ?? firstVector).length;
	// Initialise to -1 so the first assignment is always detected as a change,
	// making the convergence check reliable (a 0-init hides points whose best
	// centroid is index 0 on the first pass).
	const assign: number[] = new Array<number>(n).fill(-1);

	// --- Lloyd iterations ---
	for (let iter = 0; iter < iterations; iter++) {
		let changed = false;
		for (let i = 0; i < n; i++) {
			const v = vectors[i];
			if (!v) continue;
			let bestIdx = 0;
			let bestDist = Number.POSITIVE_INFINITY;
			for (let c = 0; c < centroids.length; c++) {
				const centroid = centroids[c];
				if (!centroid) continue;
				const d = euclideanDistance(v, centroid);
				if (d < bestDist) {
					bestDist = d;
					bestIdx = c;
				}
			}
			if (assign[i] !== bestIdx) {
				assign[i] = bestIdx;
				changed = true;
			}
		}

		// Recompute centroids; skip empty clusters.
		const sums: number[][] = centroids.map(() =>
			new Array<number>(dim).fill(0),
		);
		const counts: number[] = new Array<number>(centroids.length).fill(0);
		for (let i = 0; i < n; i++) {
			const c = assign[i];
			if (c === undefined || c < 0) continue;
			const v = vectors[i];
			if (!v) continue;
			counts[c] = (counts[c] ?? 0) + 1;
			const sum = sums[c];
			if (!sum) continue;
			for (let d = 0; d < v.length; d++) {
				sum[d] = (sum[d] ?? 0) + (v[d] ?? 0);
			}
		}
		for (let c = 0; c < centroids.length; c++) {
			const count = counts[c] ?? 0;
			if (count === 0) continue;
			const sum = sums[c];
			if (!sum) continue;
			centroids[c] = sum.map((s) => s / count);
		}

		if (!changed) break;
	}

	const buckets: number[][] = centroids.map(() => []);
	for (let i = 0; i < n; i++) {
		const c = assign[i];
		if (c === undefined || c < 0) continue;
		buckets[c]?.push(i);
	}
	return buckets.filter((b) => b.length > 0);
}

/**
 * Emit a clusters/tracks ratio + size spread so clustering granularity
 * regressions are visible in Trigger.dev logs (issue #111 acceptance).
 */
function logClusterSanity(
	userId: string,
	totalTracks: number,
	clusters: number[][],
): void {
	if (clusters.length === 0) {
		logger.warn(
			{ userId, totalTracks, clusters: 0, ratio: 0 },
			"Clustering sanity: 0 clusters produced",
		);
		return;
	}
	const sizes = clusters.map((c) => c.length).sort((a, b) => a - b);
	const ratio = Number((clusters.length / totalTracks).toFixed(4));
	logger.info(
		{
			userId,
			totalTracks,
			clusters: clusters.length,
			ratio,
			minSize: sizes[0],
			medianSize: sizes[Math.floor(sizes.length / 2)],
			maxSize: sizes[sizes.length - 1],
		},
		"Clustering sanity: clusters/tracks ratio",
	);
}

function average(values: Array<number | null>): number | null {
	const filtered = values.filter(
		(value): value is number => value !== null && !Number.isNaN(value),
	);

	if (filtered.length === 0) return null;

	const total = filtered.reduce((acc, value) => acc + value, 0);
	return total / filtered.length;
}

async function ensureDefaultGenreDomain(): Promise<number> {
	const [existing] = await db
		.select({ id: genreDomain.id })
		.from(genreDomain)
		.limit(1);

	if (existing) return existing.id;

	const [inserted] = await db
		.insert(genreDomain)
		.values({
			name: "Unknown",
			description: "Default domain for unclassified clusters",
		})
		.returning({ id: genreDomain.id });

	if (!inserted) {
		throw new Error("Failed to create default genre domain");
	}
	return inserted.id;
}

function chooseDominantDomain(domainIds: Array<number | null>): number | null {
	const counts = new Map<number, number>();

	for (const id of domainIds) {
		if (id == null) continue;
		counts.set(id, (counts.get(id) ?? 0) + 1);
	}

	let bestId: number | null = null;
	let bestCount = 0;

	for (const [id, count] of counts) {
		if (count > bestCount) {
			bestId = id;
			bestCount = count;
		}
	}

	return bestId;
}
