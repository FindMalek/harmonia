import { db } from "@harmonia/db";
import { playlist, playlistTracks } from "@harmonia/db/schema/playlist";
import { track } from "@harmonia/db/schema/track";
import { logger } from "@harmonia/logger";
import { and, eq } from "drizzle-orm";
import pRetry from "p-retry";

import { getUserSpotifyAccessToken } from "./client";

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";
const MAX_TRACKS_PER_REQUEST = 100;

type SpotifyCreatePlaylistResponse = {
	id: string;
	external_urls: { spotify: string };
};

async function spotifyPost<T>(
	path: string,
	accessToken: string,
	body: unknown,
): Promise<T> {
	const response = await fetch(`${SPOTIFY_API_BASE}${path}`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${accessToken}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(body),
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(
			`Spotify API ${response.status} for ${path}: ${text.slice(0, 200)}`,
		);
	}

	return (await response.json()) as T;
}

async function spotifyPut(
	path: string,
	accessToken: string,
	body: unknown,
): Promise<void> {
	const response = await fetch(`${SPOTIFY_API_BASE}${path}`, {
		method: "PUT",
		headers: {
			Authorization: `Bearer ${accessToken}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(body),
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(
			`Spotify API ${response.status} for ${path}: ${text.slice(0, 200)}`,
		);
	}
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

	if (pl.spotifyPlaylistId) {
		return updateExistingPlaylist(
			accessToken,
			pl.spotifyPlaylistId,
			pl,
			trackUris,
			playlistId,
		);
	}

	return createNewPlaylist(accessToken, userId, pl, trackUris, playlistId);
}

async function createNewPlaylist(
	accessToken: string,
	_userId: string,
	pl: { name: string; description: string | null },
	trackUris: string[],
	playlistId: number,
): Promise<{ spotifyPlaylistId: string; spotifyUrl: string }> {
	const created = await pRetry(
		() =>
			spotifyPost<SpotifyCreatePlaylistResponse>("/me/playlists", accessToken, {
				name: pl.name,
				description: pl.description ?? "",
				public: false,
			}),
		{ retries: 2, minTimeout: 1000 },
	);

	const spotifyPlaylistId = created.id;
	const spotifyUrl = created.external_urls.spotify;

	for (let i = 0; i < trackUris.length; i += MAX_TRACKS_PER_REQUEST) {
		const batch = trackUris.slice(i, i + MAX_TRACKS_PER_REQUEST);
		await pRetry(
			() =>
				spotifyPost(`/playlists/${spotifyPlaylistId}/tracks`, accessToken, {
					uris: batch,
				}),
			{ retries: 2, minTimeout: 1000 },
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
): Promise<{ spotifyPlaylistId: string; spotifyUrl: string }> {
	await pRetry(
		() =>
			spotifyPut(`/playlists/${spotifyPlaylistId}`, accessToken, {
				name: pl.name,
				description: pl.description ?? "",
			}),
		{ retries: 2, minTimeout: 1000 },
	);

	await pRetry(
		() =>
			spotifyPut(`/playlists/${spotifyPlaylistId}/tracks`, accessToken, {
				uris: trackUris.slice(0, MAX_TRACKS_PER_REQUEST),
			}),
		{ retries: 2, minTimeout: 1000 },
	);

	for (
		let i = MAX_TRACKS_PER_REQUEST;
		i < trackUris.length;
		i += MAX_TRACKS_PER_REQUEST
	) {
		const batch = trackUris.slice(i, i + MAX_TRACKS_PER_REQUEST);
		await pRetry(
			() =>
				spotifyPost(`/playlists/${spotifyPlaylistId}/tracks`, accessToken, {
					uris: batch,
				}),
			{ retries: 2, minTimeout: 1000 },
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
