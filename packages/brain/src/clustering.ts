import { db } from "@harmonia/db";
import { cluster, clusterTracks } from "@harmonia/db/schema/cluster";
import { track } from "@harmonia/db/schema/track";
import { logger } from "@harmonia/logger";
import { and, eq, isNotNull } from "drizzle-orm";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore – density-clustering has no default TS types
import Clustering from "density-clustering";

const CLUSTER_MIN_POINTS = 5;
const CLUSTER_EPSILON = 0.5;

export async function runClustering(userId: string): Promise<void> {
	const tracks = await db
		.select()
		.from(track)
		.where(and(eq(track.userId, userId), isNotNull(track.embedding)));

	if (tracks.length === 0) {
		logger.info({ userId }, "No tracks with embeddings; skipping clustering");
		return;
	}

	const embeddings = tracks.map((t) => t.embedding as number[]);

	if (embeddings.length < CLUSTER_MIN_POINTS) {
		logger.info(
			{ userId, count: embeddings.length },
			"Not enough tracks for clustering; skipping",
		);
		return;
	}

	const dbscan = new (Clustering as any).DBSCAN();
	const clusters = dbscan.run(embeddings, CLUSTER_EPSILON, CLUSTER_MIN_POINTS) as number[][];

	if (!clusters.length) {
		logger.info({ userId }, "DBSCAN produced no clusters");
		return;
	}

	// Reset previous clusters for this user; cascade will remove clusterTracks
	await db.delete(cluster).where(eq(cluster.userId, userId));

	for (const indices of clusters) {
		if (indices.length === 0) continue;

		const clusterTracksForUser = indices.map((index) => tracks[index]);

		const size = clusterTracksForUser.length;

		const centroid = computeCentroid(clusterTracksForUser.map((t) => t.embedding as number[]));

		const avgValence = average(
			clusterTracksForUser.map((t) => t.valence ?? null),
		);
		const avgEnergy = average(
			clusterTracksForUser.map((t) => t.energy ?? null),
		);
		const avgTempo = average(
			clusterTracksForUser.map((t) => t.tempo ?? null),
		);

		const genreDomainId = chooseDominantDomain(
			clusterTracksForUser.map((t) => t.genreDomainId ?? null),
		);

		const [inserted] = await db
			.insert(cluster)
			.values({
				userId,
				genreDomainId: genreDomainId ?? 1, // fallback to some domain to satisfy not-null constraint
				centroid,
				size,
				avgValence,
				avgEnergy,
				avgTempo,
			})
			.returning({ id: cluster.id });

		const clusterId = inserted.id;

		const joinRows = clusterTracksForUser.map((t, position) => ({
			clusterId,
			trackId: t.id,
			position,
		}));

		if (joinRows.length > 0) {
			await db.insert(clusterTracks).values(joinRows);
		}
	}

	logger.info(
		{ userId, clusters: clusters.length },
		"Completed clustering for user tracks",
	);
}

function computeCentroid(vectors: number[][]): number[] {
	if (vectors.length === 0) return [];

	const dimension = vectors[0]?.length ?? 0;
	const sums = new Array<number>(dimension).fill(0);

	for (const vector of vectors) {
		for (let index = 0; index < dimension; index++) {
			sums[index] += vector[index] ?? 0;
		}
	}

	return sums.map((sum) => sum / vectors.length);
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

