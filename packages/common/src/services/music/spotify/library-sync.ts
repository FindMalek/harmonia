import type {
	SpotifyLibraryStats,
	SpotifyPlaylistTrackItem,
	SpotifySavedTracksResponse,
} from "@harmonia/common/schemas";
import type { SyncProgress } from "@harmonia/common/types";
import { conflictValue, conflictValuePreserveExisting, db } from "@harmonia/db";
import {
	userPlaylistSnapshots,
	userSpotifyLibraryStats,
} from "@harmonia/db/schema/spotify";
import { track, userTracks } from "@harmonia/db/schema/track";
import { logger } from "@harmonia/logger";
import pLimit from "p-limit";

import {
	LIKED_PHASE_PERCENT_CAP_BEFORE_MILESTONE,
	PLAYLIST_FETCH_CONCURRENCY,
	PLAYLIST_FETCH_DELAY_MS,
	TRACK_UPSERT_BATCH_SIZE,
} from "../../../constants/spotify";
import {
	fetchAllSavedTracks,
	fetchAllUserPlaylists,
	fetchPlaylistItems,
	getSpotifyAccount,
	getUserSpotifyAccessToken,
} from "./client";
import {
	getCachedPlaylistItems,
	setCachedPlaylistItems,
} from "./playlist-cache";

function likedPhaseSubPercent(args: {
	cumulativeRows: number;
	total: number | undefined;
	pageIndex: number;
	hasNext: boolean;
}): number {
	const cap = LIKED_PHASE_PERCENT_CAP_BEFORE_MILESTONE;
	const { cumulativeRows, total, pageIndex, hasNext } = args;
	if (total !== undefined && total > 0) {
		return Math.min(cap, Math.ceil((cumulativeRows / total) * cap));
	}
	if (!hasNext && cumulativeRows === 0) {
		return 0;
	}
	const step = 3;
	return Math.min(cap, (pageIndex + 1) * step);
}

type TrackForUpsert = {
	id: string;
	uri: string;
	name: string;
	artistNames: string;
	artistIds: Array<string | null>;
	albumName: string | null;
	albumId: string | null;
	albumImageUrl: string | null;
	releaseDate: string | null;
	explicit: boolean | null;
	popularity: number | null;
	durationMs: number | null;
};

function normalizeTrack(t: {
	id: string | null;
	name: string;
	uri?: string;
	duration_ms?: number | null;
	explicit?: boolean;
	popularity?: number;
	artists?: Array<{ id?: string | null; name: string }>;
	album?: {
		id?: string | null;
		name: string;
		release_date?: string;
		images?: Array<{ url: string }>;
	} | null;
}): TrackForUpsert | null {
	if (!t?.id) return null;
	return {
		id: t.id,
		uri: t.uri ?? `spotify:track:${t.id}`,
		name: t.name,
		artistNames: JSON.stringify((t.artists ?? []).map((a) => a.name)),
		artistIds: (t.artists ?? []).map((a) => a.id ?? null),
		albumName: t.album?.name ?? null,
		albumId: t.album?.id ?? null,
		albumImageUrl:
			t.album?.images?.[2]?.url ?? t.album?.images?.[0]?.url ?? null,
		releaseDate: t.album?.release_date ?? null,
		explicit: t.explicit ?? null,
		popularity: t.popularity ?? null,
		durationMs: t.duration_ms ?? null,
	};
}

/**
 * Splits tracks into ones whose real "liked at" date is known (from
 * Spotify's saved-tracks `added_at`) vs. unknown (track was only ever seen
 * via a playlist scan, never in Liked Songs) — the two groups need different
 * upsert conflict handling: known dates can safely overwrite a stale
 * placeholder, unknown ones must never clobber an already-correct value with
 * the insert-time default (#214). Pure, no I/O.
 */
export function partitionTracksByKnownLikedAt<T extends { id: string }>(
	tracks: T[],
	likedAtByTrackId: ReadonlyMap<string, Date>,
): { withLikedAt: Array<T & { addedAt: Date }>; withoutLikedAt: T[] } {
	const withLikedAt: Array<T & { addedAt: Date }> = [];
	const withoutLikedAt: T[] = [];

	for (const t of tracks) {
		const addedAt = likedAtByTrackId.get(t.id);
		if (addedAt) {
			withLikedAt.push({ ...t, addedAt });
		} else {
			withoutLikedAt.push(t);
		}
	}

	return { withLikedAt, withoutLikedAt };
}

export function extractTrackInfo(items: SpotifyPlaylistTrackItem[]): {
	trackIds: Set<string>;
	albumKeys: Set<string>;
	artistKeys: Set<string>;
	tracks: TrackForUpsert[];
} {
	const trackIds = new Set<string>();
	const albumKeys = new Set<string>();
	const artistKeys = new Set<string>();
	const tracks: TrackForUpsert[] = [];

	for (const item of items) {
		const t = item.track;
		if (!t?.id) continue;

		trackIds.add(t.id);
		const albumKey = t.album?.id ?? t.album?.name ?? "";
		if (albumKey) albumKeys.add(albumKey);
		for (const a of t.artists ?? []) {
			const artistKey = a.id ?? a.name ?? "";
			if (artistKey) artistKeys.add(artistKey);
		}

		const normalized = normalizeTrack(t);
		if (normalized) tracks.push(normalized);
	}

	return { trackIds, albumKeys, artistKeys, tracks };
}

export function toStats(
	trackIds: Set<string>,
	totalPlaylists: number,
	albumKeys: Set<string>,
	artistKeys: Set<string>,
): SpotifyLibraryStats {
	return {
		totalTracks: trackIds.size,
		totalPlaylists,
		uniqueAlbums: albumKeys.size,
		uniqueArtists: artistKeys.size,
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

	const spotifyAccount = await getSpotifyAccount(userId);
	const spotifyUserId = spotifyAccount?.accountId ?? null;

	const trackIds = new Set<string>();
	const albumNames = new Set<string>();
	const artistNames = new Set<string>();
	const tracksMap = new Map<string, TrackForUpsert>();
	// Real "liked at" date per track, from Spotify's saved-tracks added_at —
	// only populated for tracks actually in Liked Songs (#214).
	const likedAtByTrackId = new Map<string, Date>();

	// 1. Saved tracks (progress per Spotify page)
	let savedTracksTotalFromApi: number | undefined;

	const mergeSavedPage = (items: SpotifySavedTracksResponse["items"]) => {
		for (const item of items) {
			const t = item.track;
			if (!t?.id) continue;
			trackIds.add(t.id);
			const album = t.album as
				| { id?: string; name?: string }
				| null
				| undefined;
			const albumKey = album?.id ?? album?.name ?? "";
			if (albumKey) albumNames.add(albumKey);
			for (const a of t.artists ?? []) {
				const artist = a as { id?: string; name: string };
				const artistKey = artist.id ?? artist.name ?? "";
				if (artistKey) artistNames.add(artistKey);
			}
			const normalized = normalizeTrack(t);
			if (normalized) {
				tracksMap.set(normalized.id, normalized);
				likedAtByTrackId.set(normalized.id, new Date(item.added_at));
			}
		}
	};

	await fetchAllSavedTracks(accessToken, {
		onPage: async ({
			items,
			cumulativeTrackCount,
			total,
			pageIndex,
			hasNext,
		}) => {
			if (total !== undefined) {
				savedTracksTotalFromApi = total;
			}
			mergeSavedPage(items);
			if (!onProgress) return;
			const percent = likedPhaseSubPercent({
				cumulativeRows: cumulativeTrackCount,
				total: savedTracksTotalFromApi ?? total,
				pageIndex,
				hasNext,
			});
			await onProgress({
				phase: "liked",
				phasesCompleted: 0,
				percent,
				done: false,
				total: savedTracksTotalFromApi ?? total ?? 0,
			});
		},
	});

	if (onProgress) {
		await onProgress({
			phase: "liked",
			phasesCompleted: 1,
			percent: 25,
			done: false,
			total: 0,
		});
	}

	// 2. Playlists
	const playlists = await fetchAllUserPlaylists(accessToken);
	const totalPlaylists = playlists.length;

	// 3. For each playlist: use cache if snapshot matches, else fetch and cache
	const limit = pLimit(PLAYLIST_FETCH_CONCURRENCY);
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
						setTimeout(
							r,
							(i % PLAYLIST_FETCH_CONCURRENCY) * PLAYLIST_FETCH_DELAY_MS,
						),
					);
					try {
						items = await fetchPlaylistItems(accessToken, playlist.id);
						await setCachedPlaylistItems(
							userId,
							playlist.id,
							snapshotId,
							items,
						);
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
					} catch (err) {
						logger.warn(
							{ userId, playlistId: playlist.id, error: String(err) },
							"Failed to fetch playlist items; skipping",
						);
						return;
					}
				}

				// Followed (non-owned) playlists are cached above for snapshot
				// purposes but excluded here: clustering should only draw from
				// Liked Songs + playlists the user actually owns, not playlists
				// they merely follow (#167).
				const isOwned =
					spotifyUserId !== null && playlist.owner?.id === spotifyUserId;
				if (!isOwned) return;

				const info = extractTrackInfo(items);
				for (const id of info.trackIds) trackIds.add(id);
				for (const key of info.albumKeys) albumNames.add(key);
				for (const key of info.artistKeys) artistNames.add(key);
				for (const t of info.tracks) tracksMap.set(t.id, t);
			}),
		),
	);

	if (onProgress) {
		await onProgress({
			phase: "playlists",
			phasesCompleted: 2,
			percent: 60,
			done: false,
			total: 0,
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

	if (onProgress) {
		await onProgress({
			phase: "preparing",
			phasesCompleted: 3,
			percent: 85,
			done: false,
			total: tracks.length,
		});
	}

	const now = new Date();
	const values = tracks.map((t) => ({
		id: t.id,
		spotifyUri: t.uri,
		name: t.name,
		artistNames: t.artistNames,
		artistIds: t.artistIds,
		albumName: t.albumName,
		albumId: t.albumId,
		albumImageUrl: t.albumImageUrl,
		releaseDate: t.releaseDate,
		explicit: t.explicit,
		popularity: t.popularity,
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
					spotifyUri: conflictValue(track.spotifyUri),
					name: conflictValue(track.name),
					artistNames: conflictValue(track.artistNames),
					artistIds: conflictValue(track.artistIds),
					albumName: conflictValue(track.albumName),
					albumId: conflictValue(track.albumId),
					albumImageUrl: conflictValue(track.albumImageUrl),
					// A stale cached playlist-items entry (fetched before these three
					// fields were added to the Spotify request) or a plain Saved
					// Tracks re-sync racing a playlist scan for the same track can
					// legitimately produce null here even though a good value is
					// already stored — preserve the existing value rather than
					// erasing it (#230 review).
					releaseDate: conflictValuePreserveExisting(track.releaseDate),
					explicit: conflictValuePreserveExisting(track.explicit),
					popularity: conflictValuePreserveExisting(track.popularity),
					durationMs: conflictValue(track.durationMs),
					spotifyGenres: conflictValue(track.spotifyGenres),
					updatedAt: conflictValue(track.updatedAt),
				},
			});
	}

	// Tracks with a known real liked-at date self-heal a stale placeholder on
	// every sync; tracks without one must never touch an existing row's
	// addedAt with the insert-time default (#214).
	const { withLikedAt, withoutLikedAt } = partitionTracksByKnownLikedAt(
		tracks,
		likedAtByTrackId,
	);

	for (let i = 0; i < withLikedAt.length; i += TRACK_UPSERT_BATCH_SIZE) {
		const batch = withLikedAt.slice(i, i + TRACK_UPSERT_BATCH_SIZE);
		await db
			.insert(userTracks)
			.values(batch.map((t) => ({ userId, trackId: t.id, addedAt: t.addedAt })))
			.onConflictDoUpdate({
				target: [userTracks.userId, userTracks.trackId],
				set: { addedAt: conflictValue(userTracks.addedAt) },
			});
	}

	for (let i = 0; i < withoutLikedAt.length; i += TRACK_UPSERT_BATCH_SIZE) {
		const batch = withoutLikedAt.slice(i, i + TRACK_UPSERT_BATCH_SIZE);
		await db
			.insert(userTracks)
			.values(batch.map((t) => ({ userId, trackId: t.id })))
			.onConflictDoNothing();
	}

	const result: SyncProgress & { stats?: SpotifyLibraryStats } = {
		total: tracks.length,
		done: true,
		stats,
		phase: "preparing",
		phasesCompleted: 3,
		percent: 100,
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
