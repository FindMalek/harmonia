import { db } from "@harmonia/db";
import { cluster } from "@harmonia/db/schema/cluster";
import {
	playlist,
	playlistClusters,
	playlistTracks,
} from "@harmonia/db/schema/playlist";
import { track, userTracks } from "@harmonia/db/schema/track";
import { logger } from "@harmonia/logger";
import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";

import { TRACK_MATCH_SIMILARITY_THRESHOLD } from "../../constants/brain";

export type TrackMatchResult = {
	matched: number;
	touchedPlaylistIds: number[];
};

export async function matchNewTracksToPlaylists(
	userId: string,
): Promise<TrackMatchResult> {
	const playlists = await db
		.select({
			id: playlist.id,
			clusterId: cluster.id,
			centroid: cluster.centroid,
		})
		.from(playlist)
		.innerJoin(playlistClusters, eq(playlistClusters.playlistId, playlist.id))
		.innerJoin(cluster, eq(cluster.id, playlistClusters.clusterId))
		.where(and(eq(playlist.userId, userId), isNotNull(cluster.centroid)));

	if (playlists.length === 0) {
		logger.info(
			{ userId },
			"No playlists with centroids; skipping track matching",
		);
		return { matched: 0, touchedPlaylistIds: [] };
	}

	const existingAssignments = await db
		.select({ trackId: playlistTracks.trackId })
		.from(playlistTracks)
		.innerJoin(playlist, eq(playlist.id, playlistTracks.playlistId))
		.where(eq(playlist.userId, userId));

	const assignedTrackIds = new Set(existingAssignments.map((r) => r.trackId));

	const userTrackIds = db
		.select({ trackId: userTracks.trackId })
		.from(userTracks)
		.where(eq(userTracks.userId, userId));

	const unassignedTracks = await db
		.select({
			id: track.id,
			embedding: track.embedding,
		})
		.from(track)
		.where(and(inArray(track.id, userTrackIds), isNotNull(track.embedding)));

	const tracksToMatch = unassignedTracks.filter(
		(t) => !assignedTrackIds.has(t.id),
	);

	if (tracksToMatch.length === 0) {
		logger.info({ userId }, "No unassigned tracks to match");
		return { matched: 0, touchedPlaylistIds: [] };
	}

	let matched = 0;
	const touchedPlaylistIds = new Set<number>();

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

		if (
			bestPlaylistId !== null &&
			bestSimilarity >= TRACK_MATCH_SIMILARITY_THRESHOLD
		) {
			const [maxPos] = await db
				.select({
					max: sql<number>`COALESCE(MAX(${playlistTracks.position}), -1)`,
				})
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
			touchedPlaylistIds.add(bestPlaylistId);
		}
	}

	for (const pid of touchedPlaylistIds) {
		const [countResult] = await db
			.select({ count: sql<number>`COUNT(*)` })
			.from(playlistTracks)
			.where(eq(playlistTracks.playlistId, pid));

		await db
			.update(playlist)
			.set({ trackCount: countResult?.count ?? 0 })
			.where(eq(playlist.id, pid));
	}

	logger.info(
		{ userId, matched, total: tracksToMatch.length },
		"Completed track-to-playlist matching",
	);

	return { matched, touchedPlaylistIds: [...touchedPlaylistIds] };
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
