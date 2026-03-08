import type { SpotifyPlaylistTrackItem } from "@harmonia/common/schemas";
import type { SpotifyLibraryStats } from "../../../schemas/spotify/output";
import { logger } from "@harmonia/logger";

import {
	fetchAllPlaylistTracks,
	fetchAllSavedTracks,
	fetchAllUserPlaylists,
	getUserSpotifyAccessToken,
} from "./client";

function extractTrackInfo(items: SpotifyPlaylistTrackItem[]): {
	trackIds: Set<string>;
	albumNames: Set<string>;
	artistNames: Set<string>;
} {
	const trackIds = new Set<string>();
	const albumNames = new Set<string>();
	const artistNames = new Set<string>();

	for (const item of items) {
		const track = item.track;
		if (!track?.id) continue;

		trackIds.add(track.id);
		if (track.album?.name) {
			albumNames.add(track.album.name);
		}
		for (const a of track.artists ?? []) {
			if (a.name) artistNames.add(a.name);
		}
	}

	return { trackIds, albumNames, artistNames };
}

export async function getSpotifyLibraryStats(
	userId: string,
): Promise<SpotifyLibraryStats> {
	const accessToken = await getUserSpotifyAccessToken(userId);

	if (!accessToken) {
		logger.info(
			{ userId },
			"Skipping getSpotifyLibraryStats: no Spotify access token",
		);
		return {
			totalTracks: 0,
			totalPlaylists: 0,
			uniqueAlbums: 0,
			uniqueArtists: 0,
		};
	}

	const trackIds = new Set<string>();
	const albumNames = new Set<string>();
	const artistNames = new Set<string>();

	// 1. Saved tracks (liked songs)
	const savedItems = await fetchAllSavedTracks(accessToken);
	for (const item of savedItems) {
		const t = item.track;
		if (!t?.id) continue;
		trackIds.add(t.id);
		if (t.album?.name) albumNames.add(t.album.name);
		for (const a of t.artists ?? []) {
			if (a.name) artistNames.add(a.name);
		}
	}

	// 2. User playlists
	const playlists = await fetchAllUserPlaylists(accessToken);
	const totalPlaylists = playlists.length;

	// 3. Tracks from each playlist
	for (const playlist of playlists) {
		try {
			const items = await fetchAllPlaylistTracks(accessToken, playlist.id);
			const info = extractTrackInfo(items);
			for (const id of info.trackIds) trackIds.add(id);
			for (const name of info.albumNames) albumNames.add(name);
			for (const name of info.artistNames) artistNames.add(name);
		} catch (err) {
			logger.warn(
				{ userId, playlistId: playlist.id, error: String(err) },
				"Failed to fetch playlist tracks; skipping",
			);
		}
	}

	logger.info(
		{
			userId,
			totalTracks: trackIds.size,
			totalPlaylists,
			uniqueAlbums: albumNames.size,
			uniqueArtists: artistNames.size,
		},
		"Computed Spotify library stats",
	);

	return {
		totalTracks: trackIds.size,
		totalPlaylists,
		uniqueAlbums: albumNames.size,
		uniqueArtists: artistNames.size,
	};
}
