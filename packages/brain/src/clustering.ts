import { db } from "@harmonia/db";
import { cluster, clusterTracks } from "@harmonia/db/schema/cluster";
import { track } from "@harmonia/db/schema/track";
import { logger } from "@harmonia/logger";
import { and, eq, isNotNull } from "drizzle-orm";

import Clustering from "density-clustering";

const CLUSTER_MIN_POINTS = 5;
const CLUSTER_EPSILON = 0.5;
const CLUSTER_MIN_SIZE = 20;
const CLUSTER_MAX_SIZE = 80;

export type ClusterProgress = {
	clusters: number;
	noise: number;
	totalTracks: number;
};

export async function runClustering(
	userId: string,
	onProgress?: (progress: ClusterProgress) => Promise<void>,
): Promise<ClusterProgress> {
	const stats: ClusterProgress = { clusters: 0, noise: 0, totalTracks: 0 };

	const tracks = await db
		.select()
		.from(track)
		.where(and(eq(track.userId, userId), isNotNull(track.embedding)));

	if (tracks.length === 0) {
		logger.info({ userId }, "No tracks with embeddings; skipping clustering");
		return stats;
	}

	stats.totalTracks = tracks.length;

	const embeddings = tracks.map((t) => t.embedding as number[]);

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

	await db.delete(cluster).where(eq(cluster.userId, userId));

	for (const indices of finalClusters) {
		if (indices.length === 0) continue;

		const clusterTracksForUser = indices
			.map((index) => tracks[index])
			.filter((t): t is (typeof tracks)[number] => t != null);

		if (clusterTracksForUser.length === 0) continue;

		const size = clusterTracksForUser.length;

		const centroid = computeCentroid(
			clusterTracksForUser.map((t) => t.embedding as number[]),
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
				genreDomainId: genreDomainId ?? 1,
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

		if (subClusters.length <= 1) {
			result.push(indices);
			continue;
		}

		for (const sub of subClusters) {
			result.push(sub.map((si) => indices[si] as number));
		}
	}

	return result;
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

function average(values: Array<number | null>): number | null {
	const filtered = values.filter(
		(value): value is number => value !== null && !Number.isNaN(value),
	);

	if (filtered.length === 0) return null;

	const total = filtered.reduce((acc, value) => acc + value, 0);
	return total / filtered.length;
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
