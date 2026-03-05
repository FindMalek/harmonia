import { db } from "@harmonia/db";
import { cluster } from "@harmonia/db/schema/cluster";
import { playlist, playlistTracks } from "@harmonia/db/schema/playlist";
import { track } from "@harmonia/db/schema/track";
import { logger } from "@harmonia/logger";
import { and, eq, isNotNull, sql } from "drizzle-orm";

const SIMILARITY_THRESHOLD = 0.7;

export async function matchNewTracksToPlaylists(
	userId: string,
): Promise<number> {
	const playlists = await db
		.select({
			id: playlist.id,
			clusterId: cluster.id,
			centroid: cluster.centroid,
		})
		.from(playlist)
		.innerJoin(
			sql`playlist_clusters`,
			sql`playlist_clusters.playlist_id = ${playlist.id}`,
		)
		.innerJoin(
			cluster,
			sql`${cluster.id} = playlist_clusters.cluster_id`,
		)
		.where(
			and(eq(playlist.userId, userId), isNotNull(cluster.centroid)),
		);

	if (playlists.length === 0) {
		logger.info({ userId }, "No playlists with centroids; skipping track matching");
		return 0;
	}

	const existingAssignments = await db
		.select({ trackId: playlistTracks.trackId })
		.from(playlistTracks)
		.innerJoin(playlist, eq(playlist.id, playlistTracks.playlistId))
		.where(eq(playlist.userId, userId));

	const assignedTrackIds = new Set(existingAssignments.map((r) => r.trackId));

	const unassignedTracks = await db
		.select({
			id: track.id,
			embedding: track.embedding,
		})
		.from(track)
		.where(
			and(eq(track.userId, userId), isNotNull(track.embedding)),
		);

	const tracksToMatch = unassignedTracks.filter(
		(t) => !assignedTrackIds.has(t.id),
	);

	if (tracksToMatch.length === 0) {
		logger.info({ userId }, "No unassigned tracks to match");
		return 0;
	}

	let matched = 0;

	for (const t of tracksToMatch) {
		const embedding = t.embedding as number[];
		let bestPlaylistId: number | null = null;
		let bestSimilarity = -1;

		for (const p of playlists) {
			const centroid = p.centroid as number[];
			if (!centroid || centroid.length === 0) continue;

			const similarity = cosineSimilarity(embedding, centroid);
			if (similarity > bestSimilarity) {
				bestSimilarity = similarity;
				bestPlaylistId = p.id;
			}
		}

		if (bestPlaylistId !== null && bestSimilarity >= SIMILARITY_THRESHOLD) {
			const [maxPos] = await db
				.select({ max: sql<number>`COALESCE(MAX(${playlistTracks.position}), -1)` })
				.from(playlistTracks)
				.where(eq(playlistTracks.playlistId, bestPlaylistId));

			const nextPosition = (maxPos?.max ?? -1) + 1;

			await db
				.insert(playlistTracks)
				.values({
					playlistId: bestPlaylistId,
					trackId: t.id,
					position: nextPosition,
				})
				.onConflictDoNothing();

			matched++;
		}
	}

	if (matched > 0) {
		const playlistIds = [...new Set(playlists.map((p) => p.id))];
		for (const pid of playlistIds) {
			const [countResult] = await db
				.select({ count: sql<number>`COUNT(*)` })
				.from(playlistTracks)
				.where(eq(playlistTracks.playlistId, pid));

			await db
				.update(playlist)
				.set({ trackCount: countResult?.count ?? 0 })
				.where(eq(playlist.id, pid));
		}
	}

	logger.info(
		{ userId, matched, total: tracksToMatch.length },
		"Completed track-to-playlist matching",
	);

	return matched;
}

function cosineSimilarity(a: number[], b: number[]): number {
	if (a.length !== b.length || a.length === 0) return 0;

	let dot = 0;
	let normA = 0;
	let normB = 0;

	for (let i = 0; i < a.length; i++) {
		const ai = a[i] ?? 0;
		const bi = b[i] ?? 0;
		dot += ai * bi;
		normA += ai * ai;
		normB += bi * bi;
	}

	const denom = Math.sqrt(normA) * Math.sqrt(normB);
	return denom === 0 ? 0 : dot / denom;
}
