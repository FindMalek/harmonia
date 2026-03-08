import { db } from "@harmonia/db";
import { userSpotifyLibraryStats } from "@harmonia/db/schema/spotify";
import type { SpotifyPlaylistTrackItem } from "@harmonia/common/schemas";
import type { SpotifyLibraryStats } from "../../../schemas/spotify/output";
import { logger } from "@harmonia/logger";
import { eq } from "drizzle-orm";

import {
	fetchAllPlaylistTracks,
	fetchAllSavedTracks,
	fetchAllUserPlaylists,
	getUserSpotifyAccessToken,
} from "./client";

const STALE_MS = 5 * 60 * 1000; // 5 minutes
const PLAYLIST_FETCH_DELAY_MS = 100;

const refreshLocks = new Map<string, Promise<SpotifyLibraryStats>>();

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

function toStats(
	trackIds: Set<string>,
	totalPlaylists: number,
	albumNames: Set<string>,
	artistNames: Set<string>,
): SpotifyLibraryStats {
	return {
		totalTracks: trackIds.size,
		totalPlaylists,
		uniqueAlbums: albumNames.size,
		uniqueArtists: artistNames.size,
	};
}

/**
 * Fetches stats from Spotify API and upserts into the database.
 * Called when cache is missing or stale.
 */
export async function refreshSpotifyLibraryStats(
	userId: string,
): Promise<SpotifyLibraryStats> {
	const accessToken = await getUserSpotifyAccessToken(userId);

	if (!accessToken) {
		logger.info(
			{ userId },
			"Skipping refreshSpotifyLibraryStats: no Spotify access token",
		);
		const empty = toStats(new Set(), 0, new Set(), new Set());
		await db
			.insert(userSpotifyLibraryStats)
			.values({
				userId,
				totalTracks: 0,
				totalPlaylists: 0,
				uniqueAlbums: 0,
				uniqueArtists: 0,
			})
			.onConflictDoUpdate({
				target: userSpotifyLibraryStats.userId,
				set: {
					totalTracks: 0,
					totalPlaylists: 0,
					uniqueAlbums: 0,
					uniqueArtists: 0,
					updatedAt: new Date(),
				},
			});
		return empty;
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

	// 3. Tracks from each playlist (throttle to avoid rate limits)
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
		await new Promise((r) => setTimeout(r, PLAYLIST_FETCH_DELAY_MS));
	}

	const stats = toStats(trackIds, totalPlaylists, albumNames, artistNames);

	logger.info(
		{
			userId,
			totalTracks: stats.totalTracks,
			totalPlaylists: stats.totalPlaylists,
			uniqueAlbums: stats.uniqueAlbums,
			uniqueArtists: stats.uniqueArtists,
		},
		"Computed Spotify library stats",
	);

	await db
		.insert(userSpotifyLibraryStats)
		.values({
			userId,
			totalTracks: stats.totalTracks,
			totalPlaylists: stats.totalPlaylists,
			uniqueAlbums: stats.uniqueAlbums,
			uniqueArtists: stats.uniqueArtists,
		})
		.onConflictDoUpdate({
			target: userSpotifyLibraryStats.userId,
			set: {
				totalTracks: stats.totalTracks,
				totalPlaylists: stats.totalPlaylists,
				uniqueAlbums: stats.uniqueAlbums,
				uniqueArtists: stats.uniqueArtists,
				updatedAt: new Date(),
			},
		});

	return stats;
}

/**
 * Returns cached Spotify library stats. Uses DB cache with 5-minute stale-while-revalidate.
 * - Fresh cache: returns immediately.
 * - Stale cache: returns cached, triggers background refresh.
 * - No cache: fetches from Spotify (blocking), then returns.
 */
export async function getSpotifyLibraryStats(
	userId: string,
): Promise<SpotifyLibraryStats> {
	const [cached] = await db
		.select()
		.from(userSpotifyLibraryStats)
		.where(eq(userSpotifyLibraryStats.userId, userId))
		.limit(1);

	const now = Date.now();
	const updatedAt = cached?.updatedAt?.getTime() ?? 0;
	const isFresh = cached && now - updatedAt < STALE_MS;

	if (isFresh) {
		return {
			totalTracks: cached.totalTracks,
			totalPlaylists: cached.totalPlaylists,
			uniqueAlbums: cached.uniqueAlbums,
			uniqueArtists: cached.uniqueArtists,
		};
	}

	if (cached) {
		// Stale: return cached, trigger background refresh
		const staleStats: SpotifyLibraryStats = {
			totalTracks: cached.totalTracks,
			totalPlaylists: cached.totalPlaylists,
			uniqueAlbums: cached.uniqueAlbums,
			uniqueArtists: cached.uniqueArtists,
		};

		const existing = refreshLocks.get(userId);
		if (!existing) {
			const refreshPromise = refreshSpotifyLibraryStats(userId).finally(() =>
				refreshLocks.delete(userId),
			);
			refreshLocks.set(userId, refreshPromise);
			void refreshPromise; // fire-and-forget
		}

		return staleStats;
	}

	// No cache: fetch inline (blocking)
	let refreshPromise = refreshLocks.get(userId);
	if (!refreshPromise) {
		refreshPromise = refreshSpotifyLibraryStats(userId).finally(() =>
			refreshLocks.delete(userId),
		);
		refreshLocks.set(userId, refreshPromise);
	}
	return refreshPromise;
}
