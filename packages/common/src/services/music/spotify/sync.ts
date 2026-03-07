import { db } from "@harmonia/db";
import { track } from "@harmonia/db/schema/track";
import { logger } from "@harmonia/logger";
import { sql } from "drizzle-orm";

import { fetchAllSavedTracks, getUserSpotifyAccessToken } from "./client";
import type { SpotifyTrack } from "@harmonia/common/schemas";

export type SyncProgress = {
	total: number;
	done: boolean;
};

export async function syncLikedTracks(
	userId: string,
	onProgress?: (progress: SyncProgress) => Promise<void>,
): Promise<SyncProgress> {
	const accessToken = await getUserSpotifyAccessToken(userId);

	if (!accessToken) {
		logger.info(
			{ userId },
			"Skipping syncLikedTracks: no Spotify access token",
		);
		return { total: 0, done: true };
	}

	logger.info({ userId }, "Starting syncLikedTracks from Spotify");

	const savedItems = await fetchAllSavedTracks(accessToken);

	if (savedItems.length === 0) {
		logger.info({ userId }, "No saved tracks found on Spotify");
		return { total: 0, done: true };
	}

	const tracks: SpotifyTrack[] = savedItems
		.map((item) => item.track)
		.filter((t): t is SpotifyTrack => Boolean(t?.id));

	const now = new Date();
	const values = tracks.map((t) => ({
		id: t.id,
		userId,
		spotifyUri: t.uri,
		name: t.name,
		artistNames: JSON.stringify(t.artists.map((a) => a.name)),
		albumName: t.album?.name ?? null,
		durationMs: t.duration_ms ?? null,
		spotifyGenres: null,
		valence: null,
		energy: null,
		danceability: null,
		tempo: null,
		acousticness: null,
		instrumentalness: null,
		speechiness: null,
		liveness: null,
		key: null,
		mode: null,
		lyricsStatus: "pending",
		updatedAt: now,
	}));

	const batchSize = 100;
	for (let i = 0; i < values.length; i += batchSize) {
		const batch = values.slice(i, i + batchSize);

		await db
			.insert(track)
			.values(batch)
			.onConflictDoUpdate({
				target: track.id,
				set: {
					userId: sql`excluded.user_id`,
					spotifyUri: sql`excluded.spotify_uri`,
					name: sql`excluded.name`,
					artistNames: sql`excluded.artist_names`,
					albumName: sql`excluded.album_name`,
					durationMs: sql`excluded.duration_ms`,
					spotifyGenres: sql`excluded.spotify_genres`,
					updatedAt: sql`excluded.updated_at`,
				},
			});
	}

	const result: SyncProgress = { total: values.length, done: true };

	if (onProgress) {
		await onProgress(result);
	}

	logger.info(
		{ userId, totalTracks: values.length },
		"Completed syncLikedTracks from Spotify",
	);

	return result;
}
