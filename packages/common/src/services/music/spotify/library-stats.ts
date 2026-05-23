import type {
	SpotifyLibraryStats,
	SpotifyPlaylistTrackItem,
} from "@harmonia/common/schemas";
import { conflictValue, db } from "@harmonia/db";
import {
	userPlaylistSnapshots,
	userSpotifyLibraryStats,
} from "@harmonia/db/schema/spotify";
import { eq } from "drizzle-orm";
import pLimit from "p-limit";

import {
	INCLUDE_FOLLOWED_PLAYLISTS,
	LIBRARY_STATS_CACHE_STALE_MS,
	STATS_FETCH_CONCURRENCY,
} from "../../../constants/spotify";
import {
	fetchAllUserPlaylists,
	fetchPlaylistItems,
	getSpotifyAccount,
	getUserSpotifyAccessToken,
} from "./client";
import { extractTrackInfo, toStats } from "./library-sync";
import {
	getCachedPlaylistItems,
	setCachedPlaylistItems,
} from "./playlist-cache";

const refreshLocks = new Map<string, Promise<SpotifyLibraryStats>>();

/**
 * Fetches library stats from Spotify API (owned playlists only).
 * Uses snapshot cache to avoid re-fetching unchanged playlists.
 * Aggregates tracks, albums, artists from playlist items.
 */
export async function refreshSpotifyLibraryStats(
	userId: string,
): Promise<SpotifyLibraryStats> {
	const accessToken = await getUserSpotifyAccessToken(userId);

	if (!accessToken) {
		const [cached] = await db
			.select()
			.from(userSpotifyLibraryStats)
			.where(eq(userSpotifyLibraryStats.userId, userId))
			.limit(1);
		return cached
			? {
					totalTracks: cached.totalTracks,
					totalPlaylists: cached.totalPlaylists,
					uniqueAlbums: cached.uniqueAlbums,
					uniqueArtists: cached.uniqueArtists,
					updatedAt: cached.updatedAt ?? null,
				}
			: {
					totalTracks: 0,
					totalPlaylists: 0,
					uniqueAlbums: 0,
					uniqueArtists: 0,
					updatedAt: null,
				};
	}

	const spotifyAccount = await getSpotifyAccount(userId);
	const playlists = await fetchAllUserPlaylists(accessToken, {
		ownerId: INCLUDE_FOLLOWED_PLAYLISTS ? undefined : spotifyAccount?.accountId,
	});
	const totalPlaylists = playlists.length;

	const trackIds = new Set<string>();
	const albumKeys = new Set<string>();
	const artistKeys = new Set<string>();

	const limit = pLimit(STATS_FETCH_CONCURRENCY);
	await Promise.all(
		playlists.map((playlist, i) =>
			limit(async () => {
				const snapshotId = playlist.snapshot_id ?? null;
				if (!snapshotId) return;

				const cached = await getCachedPlaylistItems(
					userId,
					playlist.id,
					snapshotId,
				);
				let items: SpotifyPlaylistTrackItem[];

				if (cached !== null) {
					items = cached;
				} else {
					await new Promise((r) =>
						setTimeout(r, (i % STATS_FETCH_CONCURRENCY) * 100),
					);
					items = await fetchPlaylistItems(accessToken, playlist.id);
					await setCachedPlaylistItems(userId, playlist.id, snapshotId, items);
					await db
						.insert(userPlaylistSnapshots)
						.values({
							userId,
							playlistId: playlist.id,
							snapshotId,
						})
						.onConflictDoUpdate({
							target: [
								userPlaylistSnapshots.userId,
								userPlaylistSnapshots.playlistId,
							],
							set: {
								snapshotId: conflictValue(userPlaylistSnapshots.snapshotId),
								updatedAt: new Date(),
							},
						});
				}

				const info = extractTrackInfo(items);
				for (const id of info.trackIds) trackIds.add(id);
				for (const key of info.albumKeys) albumKeys.add(key);
				for (const key of info.artistKeys) artistKeys.add(key);
			}),
		),
	);

	const stats = toStats(trackIds, totalPlaylists, albumKeys, artistKeys);
	const now = new Date();

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
				updatedAt: now,
			},
		});

	return { ...stats, updatedAt: now };
}

/**
 * Returns cached Spotify library stats. Uses DB cache with 24-hour stale-while-revalidate.
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
	const isFresh = cached && now - updatedAt < LIBRARY_STATS_CACHE_STALE_MS;

	if (isFresh) {
		return {
			totalTracks: cached.totalTracks,
			totalPlaylists: cached.totalPlaylists,
			uniqueAlbums: cached.uniqueAlbums,
			uniqueArtists: cached.uniqueArtists,
			updatedAt: cached.updatedAt ?? null,
		};
	}

	if (cached) {
		// Stale: return cached, trigger background refresh
		const staleStats: SpotifyLibraryStats = {
			totalTracks: cached.totalTracks,
			totalPlaylists: cached.totalPlaylists,
			uniqueAlbums: cached.uniqueAlbums,
			uniqueArtists: cached.uniqueArtists,
			updatedAt: cached.updatedAt ?? null,
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
