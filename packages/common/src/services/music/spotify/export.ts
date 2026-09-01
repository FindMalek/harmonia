import type { SpotifyCreatePlaylistResponse } from "@sonaraem/common/schemas";
import { db } from "@sonaraem/db";
import { playlist, playlistTracks } from "@sonaraem/db/schema/playlist";
import { track } from "@sonaraem/db/schema/track";
import { logger } from "@sonaraem/logger";
import { and, eq } from "drizzle-orm";
import pRetry, { AbortError } from "p-retry";

import {
	getUserSpotifyAccessToken,
	SpotifyApiError,
	spotifyRequest,
} from "./client";

const SPOTIFY_EXPORT_MAX_TRACKS_PER_REQUEST = 100;

// A 404 (deleted playlist) is never transient — abort immediately instead of burning retries on it.
function retryableSpotifyRequest<T>(fn: () => Promise<T>): Promise<T> {
	return pRetry(
		async () => {
			try {
				return await fn();
			} catch (err) {
				if (err instanceof SpotifyApiError && err.status === 404) {
					throw new AbortError(err);
				}
				throw err;
			}
		},
		{ retries: 2, minTimeout: 1000 },
	);
}

export async function exportPlaylistToSpotify(
	userId: string,
	playlistId: number,
): Promise<{ spotifyPlaylistId: string; spotifyUrl: string } | null> {
	const accessToken = await getUserSpotifyAccessToken(userId);

	if (!accessToken) {
		logger.warn({ userId }, "No Spotify access token; cannot export playlist");
		return null;
	}

	const [pl] = await db
		.select()
		.from(playlist)
		.where(and(eq(playlist.id, playlistId), eq(playlist.userId, userId)));

	if (!pl) {
		logger.warn({ playlistId }, "Playlist not found");
		return null;
	}

	const tracks = await db
		.select({
			spotifyUri: track.spotifyUri,
		})
		.from(playlistTracks)
		.innerJoin(track, eq(track.id, playlistTracks.trackId))
		.where(eq(playlistTracks.playlistId, playlistId))
		.orderBy(playlistTracks.position);

	const trackUris = tracks.map((t) => t.spotifyUri);

	if (trackUris.length === 0) {
		logger.warn({ playlistId }, "Playlist has no tracks; skipping export");
		return null;
	}

	const filteredUris = trackUris.filter(
		(uri): uri is string => uri != null && uri.length > 0,
	);

	if (filteredUris.length === 0) {
		logger.warn(
			{ playlistId },
			"Playlist tracks have no Spotify URIs; skipping export",
		);
		return null;
	}

	if (pl.spotifyPlaylistId) {
		try {
			return await updateExistingPlaylist(
				accessToken,
				pl.spotifyPlaylistId,
				pl,
				filteredUris,
				playlistId,
				userId,
			);
		} catch (err) {
			if (!(err instanceof SpotifyApiError) || err.status !== 404) {
				throw err;
			}
			logger.warn(
				{ playlistId, spotifyPlaylistId: pl.spotifyPlaylistId },
				"Spotify playlist was deleted; creating a new one",
			);
		}
	}

	return createNewPlaylist(accessToken, userId, pl, filteredUris, playlistId);
}

async function createNewPlaylist(
	accessToken: string,
	userId: string,
	pl: { name: string; description: string | null },
	trackUris: string[],
	playlistId: number,
): Promise<{ spotifyPlaylistId: string; spotifyUrl: string }> {
	const created = await retryableSpotifyRequest(() =>
		spotifyRequest<SpotifyCreatePlaylistResponse>(
			"/me/playlists",
			accessToken,
			{
				method: "POST",
				body: {
					name: pl.name,
					description: pl.description ?? "",
					public: false,
				},
			},
			undefined,
			{ userId },
		),
	);

	if (!created) {
		throw new Error("Spotify did not return a playlist after creation");
	}

	const spotifyPlaylistId = created.id;
	const spotifyUrl = created.external_urls.spotify;

	for (
		let i = 0;
		i < trackUris.length;
		i += SPOTIFY_EXPORT_MAX_TRACKS_PER_REQUEST
	) {
		const batch = trackUris.slice(i, i + SPOTIFY_EXPORT_MAX_TRACKS_PER_REQUEST);
		await retryableSpotifyRequest(() =>
			spotifyRequest(
				`/playlists/${spotifyPlaylistId}/items`,
				accessToken,
				{
					method: "POST",
					body: { uris: batch },
				},
				undefined,
				{ userId },
			),
		);
	}

	await db
		.update(playlist)
		.set({
			spotifyPlaylistId,
			exportedAt: new Date(),
		})
		.where(eq(playlist.id, playlistId));

	logger.info(
		{ playlistId, spotifyPlaylistId, trackCount: trackUris.length },
		"Created Spotify playlist",
	);

	return { spotifyPlaylistId, spotifyUrl };
}

async function updateExistingPlaylist(
	accessToken: string,
	spotifyPlaylistId: string,
	pl: { name: string; description: string | null },
	trackUris: string[],
	playlistId: number,
	userId: string,
): Promise<{ spotifyPlaylistId: string; spotifyUrl: string }> {
	await retryableSpotifyRequest(() =>
		spotifyRequest(
			`/playlists/${spotifyPlaylistId}`,
			accessToken,
			{
				method: "PUT",
				body: {
					name: pl.name,
					description: pl.description ?? "",
				},
			},
			undefined,
			{ userId },
		),
	);

	await retryableSpotifyRequest(() =>
		spotifyRequest(
			`/playlists/${spotifyPlaylistId}/items`,
			accessToken,
			{
				method: "PUT",
				body: {
					uris: trackUris.slice(0, SPOTIFY_EXPORT_MAX_TRACKS_PER_REQUEST),
				},
			},
			undefined,
			{ userId },
		),
	);

	for (
		let i = SPOTIFY_EXPORT_MAX_TRACKS_PER_REQUEST;
		i < trackUris.length;
		i += SPOTIFY_EXPORT_MAX_TRACKS_PER_REQUEST
	) {
		const batch = trackUris.slice(i, i + SPOTIFY_EXPORT_MAX_TRACKS_PER_REQUEST);
		await retryableSpotifyRequest(() =>
			spotifyRequest(
				`/playlists/${spotifyPlaylistId}/items`,
				accessToken,
				{
					method: "POST",
					body: { uris: batch },
				},
				undefined,
				{ userId },
			),
		);
	}

	await db
		.update(playlist)
		.set({ exportedAt: new Date() })
		.where(eq(playlist.id, playlistId));

	logger.info(
		{ playlistId, spotifyPlaylistId, trackCount: trackUris.length },
		"Updated Spotify playlist",
	);

	return {
		spotifyPlaylistId,
		spotifyUrl: `https://open.spotify.com/playlist/${spotifyPlaylistId}`,
	};
}

export async function exportAllPlaylists(
	userId: string,
): Promise<{ exported: number; failed: number }> {
	const playlists = await db
		.select({ id: playlist.id })
		.from(playlist)
		.where(and(eq(playlist.userId, userId), eq(playlist.isGenerated, true)));

	let exported = 0;
	let failed = 0;

	for (const pl of playlists) {
		try {
			const result = await exportPlaylistToSpotify(userId, pl.id);
			if (result) exported++;
			else failed++;
		} catch (err) {
			logger.error(
				{
					playlistId: pl.id,
					error: err instanceof Error ? err.message : String(err),
				},
				"Failed to export playlist",
			);
			failed++;
		}
	}

	logger.info({ userId, exported, failed }, "Completed batch playlist export");
	return { exported, failed };
}
