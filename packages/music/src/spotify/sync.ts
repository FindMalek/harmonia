import { db } from "@harmonia/db";
import { track } from "@harmonia/db/schema/track";
import { logger } from "@harmonia/logger";
import { sql } from "drizzle-orm";

import { fetchAllSavedTracks, getUserSpotifyAccessToken } from "./client";
import type { SpotifyTrack } from "./types";

export async function syncLikedTracks(userId: string): Promise<void> {
	const accessToken = await getUserSpotifyAccessToken(userId);

	if (!accessToken) {
		logger.info(
			{ userId },
			"Skipping syncLikedTracks: no Spotify access token",
		);
		return;
	}

	logger.info({ userId }, "Starting syncLikedTracks from Spotify");

	const savedItems = await fetchAllSavedTracks(accessToken);

	if (savedItems.length === 0) {
		logger.info({ userId }, "No saved tracks found on Spotify");
		return;
	}

	const tracks: SpotifyTrack[] = savedItems
		.map((item) => item.track)
		.filter((t): t is SpotifyTrack => Boolean(t?.id));

	// Audio features disabled: Spotify /audio-features returns 403 for apps without Extended Quota (Nov 2024).
	// See deprecation note in client.ts for alternatives (AcousticBrainz, Soundcharts, ReccoBeats).
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

	// Upsert in batches to avoid huge single queries
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
					valence: sql`excluded.valence`,
					energy: sql`excluded.energy`,
					danceability: sql`excluded.danceability`,
					tempo: sql`excluded.tempo`,
					acousticness: sql`excluded.acousticness`,
					instrumentalness: sql`excluded.instrumentalness`,
					speechiness: sql`excluded.speechiness`,
					liveness: sql`excluded.liveness`,
					key: sql`excluded.key`,
					mode: sql`excluded.mode`,
					lyricsStatus: sql`excluded.lyrics_status`,
					updatedAt: sql`excluded.updated_at`,
				},
			});
	}

	logger.info(
		{ userId, totalTracks: values.length },
		"Completed syncLikedTracks from Spotify",
	);
}
