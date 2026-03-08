import type { SpotifyLibraryStats } from "@harmonia/common/schemas";
import { db } from "@harmonia/db";
import { userSpotifyLibraryStats } from "@harmonia/db/schema/spotify";
import { eq } from "drizzle-orm";

import { fetchAllUserPlaylists, getUserSpotifyAccessToken } from "./client";

const STALE_MS = 5 * 60 * 1000; // 5 minutes

/** Per-user lock to avoid concurrent refreshes for the same user. */
const refreshLocks = new Map<string, Promise<SpotifyLibraryStats>>();

/**
 * Fetches lightweight library stats from Spotify API (playlists only, no track fetching).
 * Used for the dashboard overview. Full track sync happens only when running the Organize pipeline.
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
				}
			: {
					totalTracks: 0,
					totalPlaylists: 0,
					uniqueAlbums: 0,
					uniqueArtists: 0,
				};
	}

	const playlists = await fetchAllUserPlaylists(accessToken);
	const totalPlaylists = playlists.length;
	const stats: SpotifyLibraryStats = {
		totalTracks: 0,
		totalPlaylists,
		uniqueAlbums: 0,
		uniqueArtists: 0,
	};

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
