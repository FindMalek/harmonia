import type { ClusterProgress } from "@sonaraem/common/types";
import { db } from "@sonaraem/db";
import { cluster, clusterTracks } from "@sonaraem/db/schema/cluster";
import { genreDomain } from "@sonaraem/db/schema/genre-domain";
import { track, userTracks } from "@sonaraem/db/schema/track";
import { logger } from "@sonaraem/logger";
import Clustering from "density-clustering";
import { and, eq, inArray, isNotNull } from "drizzle-orm";

import { CLUSTER_MAX_SIZE } from "../../constants/brain";

// DBSCAN params for semantic-only embeddings — see .cursor/rules/packages/common.mdc "Clustering Tuning".
const CLUSTER_MIN_POINTS = 5;
// Fallback only now (#294) — the real per-run value comes from
// computeAutoEpsilon. Kept as the floor for libraries too small for a
// k-distance distribution to mean anything.
const CLUSTER_EPSILON = 0.3;
const CLUSTER_MIN_SIZE = 20;

// k-distance percentile used to derive eps per user (#294) — the automatic
// analogue of picking the "knee" off a k-distance elbow plot by eye. Low
// percentile because the knee sits near the dense end of the distribution;
// 10th was the value validated against real production embeddings.
const AUTO_EPS_PERCENTILE = 10;
// Caps the k-distance computation's cost on large libraries: DBSCAN itself
// pays a full O(n²) pass right after this runs, so sampling which points we
// compute a k-distance FOR (each still compared against the full dataset,
// so its own k-distance stays accurate) keeps this a fraction of that
// rather than doubling the clustering stage's cost.
const AUTO_EPS_MAX_SAMPLE = 300;

// k-means fallback k when DBSCAN finds zero clusters (#282) — validated against
// real production embeddings sampled at sizes 15-100: DBSCAN produced 0 clusters
// at essentially every sampled size with the params above, while a fixed k=3
// reliably scored a competitive-to-best silhouette (0.12-0.29) across all of
// them, beating size-scaled k formulas at the larger end of that range.
const FALLBACK_KMEANS_K = 3;

const MAX_SPLIT_DEPTH = 4;

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
	const embeddings = tracks.map((t) =>
		l2Normalize(requireEmbedding(t.embedding)),
	);

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
	const autoEpsilon = computeAutoEpsilon(embeddings, CLUSTER_MIN_POINTS);
	logger.info(
		{ userId, count: embeddings.length, autoEpsilon },
		"Clustering: using per-user auto-selected epsilon",
	);

	const dbscan = new (Clustering as DBSCANModule).DBSCAN();
	let rawClusters = dbscan.run(
		embeddings,
		autoEpsilon,
		CLUSTER_MIN_POINTS,
	) as number[][];

	stats.noise = dbscan.noise?.length ?? 0;

	if (!rawClusters.length) {
		// Small/eclectic libraries often have no 5 tracks within CLUSTER_EPSILON
		// of each other — DBSCAN's density threshold finds nothing to work with,
		// even though the user has plenty of embedded tracks to group. Fall back
		// to k-means so these libraries still get playlists instead of zero.
		logger.info(
			{ userId, count: embeddings.length },
			"DBSCAN produced no clusters; falling back to k-means",
		);
		rawClusters = kmeans(embeddings, FALLBACK_KMEANS_K);
		stats.noise = 0; // k-means assigns every point — no noise concept here

		if (!rawClusters.length) {
			logger.info({ userId }, "k-means fallback also produced no clusters");
			return stats;
		}
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

// Exported for direct unit testing (issue #204) — pure, deterministic, no I/O.
export function mergeSmallClusters(
	clusters: number[][],
	embeddings: number[][],
	minSize: number,
): number[][] {
	if (clusters.length <= 1) return clusters;

	const large: number[][] = [];
	const small: number[][] = [];

	for (const c of clusters) {
		if (c.length >= minSize) {
			large.push([...c]);
		} else {
			small.push(c);
		}
	}

	if (large.length === 0) {
		// No cluster reached minSize on its own (issue #204) — merge the two
		// closest-by-centroid small clusters together and retry, so small
		// clusters combine with whichever is musically nearest instead of
		// every one of them shipping as an under-sized playlist. Bottoms out
		// at a single cluster if the whole library is smaller than minSize,
		// which is an inherent data limit, not a bug.
		if (small.length <= 1) return clusters;

		const smallCentroids = small.map((indices) =>
			computeCentroid(indices.map((i) => embeddings[i] as number[])),
		);
		let bestI = 0;
		let bestJ = 1;
		let bestDist = Number.POSITIVE_INFINITY;
		for (let i = 0; i < small.length; i++) {
			for (let j = i + 1; j < small.length; j++) {
				const dist = euclideanDistance(
					smallCentroids[i] as number[],
					smallCentroids[j] as number[],
				);
				if (dist < bestDist) {
					bestDist = dist;
					bestI = i;
					bestJ = j;
				}
			}
		}

		const merged = [...(small[bestI] ?? []), ...(small[bestJ] ?? [])];
		const rest = small.filter((_, idx) => idx !== bestI && idx !== bestJ);
		return mergeSmallClusters([merged, ...rest], embeddings, minSize);
	}

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

// Exported for direct unit testing (issue #204) — pure, deterministic, no I/O.
export function splitLargeClusters(
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

		// Re-run DBSCAN tighter; fall back to k-means if it still won't split.
		const candidates =
			subClusters.length > 1
				? subClusters.map((sub) => sub.map((si) => indices[si] as number))
				: kmeans(
						subEmbeddings,
						Math.max(2, Math.ceil(indices.length / maxSize)),
					)
						.filter((sub) => sub.length > 0)
						.map((sub) => sub.map((si) => indices[si] as number));

		// Neither method guarantees every bucket is under maxSize, so re-split recursively.
		if (depth >= MAX_SPLIT_DEPTH) {
			// Retries are exhausted — force every remaining oversized bucket under
			// the cap with a plain positional chunk (issue #204). Not centroid-
			// aware, but a guaranteed size limit matters more than perfect
			// grouping in this now-rare fallback path.
			for (const bucket of candidates) {
				if (bucket.length <= maxSize) {
					result.push(bucket);
					continue;
				}
				for (let i = 0; i < bucket.length; i += maxSize) {
					result.push(bucket.slice(i, i + maxSize));
				}
			}
			continue;
		}
		result.push(
			...splitLargeClusters(
				candidates,
				embeddings,
				maxSize,
				minPoints,
				depth + 1,
			),
		);
	}

	return result;
}

// TS can't narrow embedding from the isNotNull() query filter; fail loudly instead of `as`.
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
 * Derives DBSCAN's eps from the data instead of one fixed constant for
 * every user (#294). Standard k-distance heuristic: for each point, find
 * the distance to its minPts-th nearest neighbour; sort those distances;
 * pick eps at a low percentile of that distribution, approximating where a
 * k-distance elbow plot would bend by eye. A user with tightly-clustered
 * taste and a user with eclectic taste land on different epsilons this way,
 * instead of both being forced through the same global threshold.
 *
 * Exported for direct unit testing — pure, deterministic, no I/O.
 */
export function computeAutoEpsilon(
	embeddings: number[][],
	minPts: number,
	percentile = AUTO_EPS_PERCENTILE,
	maxSample = AUTO_EPS_MAX_SAMPLE,
): number {
	const n = embeddings.length;
	// Need at least minPts+1 points for any point to have a minPts-th
	// neighbour at all — below that a k-distance distribution isn't
	// meaningful, so fall back to the fixed constant.
	if (n <= minPts) return CLUSTER_EPSILON;

	const step = Math.max(1, Math.floor(n / maxSample));
	const kDistances: number[] = [];

	for (let i = 0; i < n; i += step) {
		const point = embeddings[i];
		if (!point) continue;

		const distances: number[] = [];
		for (let j = 0; j < n; j++) {
			if (j === i) continue;
			const other = embeddings[j];
			if (!other) continue;
			distances.push(euclideanDistance(point, other));
		}
		distances.sort((a, b) => a - b);

		const kth = distances[minPts - 1];
		if (kth !== undefined) kDistances.push(kth);
	}

	if (kDistances.length === 0) return CLUSTER_EPSILON;

	kDistances.sort((a, b) => a - b);
	const rank = Math.floor((percentile / 100) * (kDistances.length - 1));
	const eps = kDistances[rank];

	return eps && eps > 0 ? eps : CLUSTER_EPSILON;
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
 * Exported for reuse as the small-library DBSCAN-found-nothing fallback (#282)
 * and for direct unit testing, same as mergeSmallClusters/splitLargeClusters.
 */
export function kmeans(
	vectors: number[][],
	k: number,
	iterations = 12,
): number[][] {
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
