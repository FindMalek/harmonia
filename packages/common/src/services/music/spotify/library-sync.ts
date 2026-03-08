import type { SyncProgress } from "@harmonia/common/types";
import type { SpotifyLibraryStats } from "@harmonia/common/schemas";
import type { SpotifyPlaylistTrackItem } from "@harmonia/common/schemas";
import { db } from "@harmonia/db";
import {
	userPlaylistSnapshots,
	userSpotifyLibraryStats,
} from "@harmonia/db/schema/spotify";
import { track } from "@harmonia/db/schema/track";
import { logger } from "@harmonia/logger";
import { eq, sql } from "drizzle-orm";
import pLimit from "p-limit";

import {
	fetchAllSavedTracks,
	fetchPlaylistItems,
	fetchAllUserPlaylists,
	getUserSpotifyAccessToken,
} from "./client";

const PLAYLIST_FETCH_CONCURRENCY = 3;
const PLAYLIST_FETCH_DELAY_MS = 150;
const TRACK_UPSERT_BATCH_SIZE = 100;

type TrackForUpsert = {
	id: string;
	uri: string;
	name: string;
	artistNames: string;
	albumName: string | null;
	durationMs: number | null;
};

function normalizeTrack(t: {
	id: string | null;
	name: string;
	uri?: string;
	duration_ms?: number | null;
	artists?: Array<{ name: string }>;
	album?: { name: string } | null;
}): TrackForUpsert | null {
	if (!t?.id) return null;
	return {
		id: t.id,
		uri: t.uri ?? `spotify:track:${t.id}`,
		name: t.name,
		artistNames: JSON.stringify((t.artists ?? []).map((a) => a.name)),
		albumName: t.album?.name ?? null,
		durationMs: t.duration_ms ?? null,
	};
}

function extractTrackInfo(items: SpotifyPlaylistTrackItem[]): {
	trackIds: Set<string>;
	albumNames: Set<string>;
	artistNames: Set<string>;
	tracks: TrackForUpsert[];
} {
	const trackIds = new Set<string>();
	const albumNames = new Set<string>();
	const artistNames = new Set<string>();
	const tracks: TrackForUpsert[] = [];

	for (const item of items) {
		const t = item.track;
		if (!t?.id) continue;

		trackIds.add(t.id);
		if (t.album?.name) albumNames.add(t.album.name);
		for (const a of t.artists ?? []) {
			if (a.name) artistNames.add(a.name);
		}

		const normalized = normalizeTrack(t);
		if (normalized) tracks.push(normalized);
	}

	return { trackIds, albumNames, artistNames, tracks };
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

export async function syncLibraryTracks(
	userId: string,
	onProgress?: (progress: SyncProgress) => Promise<void>,
): Promise<SyncProgress & { stats?: SpotifyLibraryStats }> {
	const accessToken = await getUserSpotifyAccessToken(userId);

	if (!accessToken) {
		logger.info(
			{ userId },
			"Skipping syncLibraryTracks: no Spotify access token",
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
		return { total: 0, done: true, stats: empty };
	}

	logger.info({ userId }, "Starting syncLibraryTracks from Spotify");

	const trackIds = new Set<string>();
	const albumNames = new Set<string>();
	const artistNames = new Set<string>();
	const tracksMap = new Map<string, TrackForUpsert>();

	// 1. Saved tracks
	const savedItems = await fetchAllSavedTracks(accessToken);
	for (const item of savedItems) {
		const t = item.track;
		if (!t?.id) continue;
		trackIds.add(t.id);
		if (t.album?.name) albumNames.add(t.album.name);
		for (const a of t.artists ?? []) {
			if (a.name) artistNames.add(a.name);
		}
		const normalized = normalizeTrack(t);
		if (normalized) tracksMap.set(normalized.id, normalized);
	}

	// 2. Playlists
	const playlists = await fetchAllUserPlaylists(accessToken);
	const totalPlaylists = playlists.length;

	// 3. Load cached snapshots
	const cachedRows = await db
		.select()
		.from(userPlaylistSnapshots)
		.where(eq(userPlaylistSnapshots.userId, userId));
	const snapshotCache = new Map(
		cachedRows.map((r) => [r.playlistId, r.snapshotId]),
	);

	// 4. Fetch changed playlists with concurrency
	const limit = pLimit(PLAYLIST_FETCH_CONCURRENCY);
	const playlistsToFetch = playlists.filter((p) => {
		const cached = snapshotCache.get(p.id);
		const current = p.snapshot_id ?? null;
		return !current || cached !== current;
	});

	await Promise.all(
		playlistsToFetch.map((playlist, i) =>
			limit(async () => {
				await new Promise((r) =>
					setTimeout(
						r,
						(i % PLAYLIST_FETCH_CONCURRENCY) * PLAYLIST_FETCH_DELAY_MS,
					),
				);
				try {
					const items = await fetchPlaylistItems(accessToken, playlist.id);
					const info = extractTrackInfo(items);
					for (const id of info.trackIds) trackIds.add(id);
					for (const name of info.albumNames) albumNames.add(name);
					for (const name of info.artistNames) artistNames.add(name);
					for (const t of info.tracks) tracksMap.set(t.id, t);
				} catch (err) {
					logger.warn(
						{ userId, playlistId: playlist.id, error: String(err) },
						"Failed to fetch playlist items; skipping",
					);
				}
			}),
		),
	);

	// 5. Update snapshot cache for fetched playlists
	for (const p of playlistsToFetch) {
		if (!p.snapshot_id) continue;
		await db
			.insert(userPlaylistSnapshots)
			.values({
				userId,
				playlistId: p.id,
				snapshotId: p.snapshot_id,
			})
			.onConflictDoUpdate({
				target: [
					userPlaylistSnapshots.userId,
					userPlaylistSnapshots.playlistId,
				],
				set: {
					snapshotId: sql`excluded.snapshot_id`,
					updatedAt: new Date(),
				},
			});
	}

	const stats = toStats(trackIds, totalPlaylists, albumNames, artistNames);

	// 6. Upsert library stats
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

	// 7. Upsert tracks
	const tracks = Array.from(tracksMap.values());
	const now = new Date();
	const values = tracks.map((t) => ({
		id: t.id,
		userId,
		spotifyUri: t.uri,
		name: t.name,
		artistNames: t.artistNames,
		albumName: t.albumName,
		durationMs: t.durationMs,
		spotifyGenres: null,
		lyricsStatus: "pending" as const,
		updatedAt: now,
	}));

	for (let i = 0; i < values.length; i += TRACK_UPSERT_BATCH_SIZE) {
		const batch = values.slice(i, i + TRACK_UPSERT_BATCH_SIZE);
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

	const result: SyncProgress & { stats?: SpotifyLibraryStats } = {
		total: tracks.length,
		done: true,
		stats,
	};

	if (onProgress) {
		await onProgress(result);
	}

	logger.info(
		{
			userId,
			totalTracks: tracks.length,
			totalPlaylists: stats.totalPlaylists,
		},
		"Completed syncLibraryTracks from Spotify",
	);

	return result;
}
