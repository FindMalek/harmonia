import { db } from "@harmonia/db";
import { track } from "@harmonia/db/schema/track";
import { logger } from "@harmonia/logger";

import {
	fetchAllSavedTracks,
	fetchAudioFeatures,
	getUserSpotifyAccessToken,
} from "./client";
import type { SpotifyAudioFeatures, SpotifyTrack } from "./types";

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

	const audioFeatures = await fetchAudioFeatures(
		tracks.map((t) => t.id),
		accessToken,
	);

	const featuresById = new Map<string, SpotifyAudioFeatures>();
	for (const features of audioFeatures) {
		if (features?.id) {
			featuresById.set(features.id, features);
		}
	}

	const values = tracks.map((t) => {
		const features = featuresById.get(t.id);

		return {
			id: t.id,
			userId,
			spotifyUri: t.uri,
			name: t.name,
			artistNames: JSON.stringify(t.artists.map((a) => a.name)),
			albumName: t.album?.name ?? null,
			durationMs: t.duration_ms ?? null,
			spotifyGenres: null,
			valence: features?.valence ?? null,
			energy: features?.energy ?? null,
			danceability: features?.danceability ?? null,
			tempo: features?.tempo ?? null,
			acousticness: features?.acousticness ?? null,
			instrumentalness: features?.instrumentalness ?? null,
			speechiness: features?.speechiness ?? null,
			liveness: features?.liveness ?? null,
			key: features?.key ?? null,
			mode: features?.mode ?? null,
		};
	});

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
					userId,
					spotifyUri: track.spotifyUri,
					name: track.name,
					artistNames: track.artistNames,
					albumName: track.albumName,
					durationMs: track.durationMs,
					spotifyGenres: track.spotifyGenres,
					valence: track.valence,
					energy: track.energy,
					danceability: track.danceability,
					tempo: track.tempo,
					acousticness: track.acousticness,
					instrumentalness: track.instrumentalness,
					speechiness: track.speechiness,
					liveness: track.liveness,
					key: track.key,
					mode: track.mode,
				},
			});
	}

	logger.info(
		{ userId, totalTracks: values.length },
		"Completed syncLikedTracks from Spotify",
	);
}
