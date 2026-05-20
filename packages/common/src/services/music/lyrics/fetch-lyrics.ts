import type { LyricsProgress } from "@harmonia/common/types";
import { db } from "@harmonia/db";
import { track, userTracks } from "@harmonia/db/schema/track";
import { logger } from "@harmonia/logger";
import { and, count, eq, inArray, isNull, or } from "drizzle-orm";
import pLimit from "p-limit";

import {
	LYRICS_BATCH_SIZE,
	LYRICS_CONCURRENCY,
} from "../../../constants/lyrics";
import { chunk } from "../../../trigger/utils/chunk";
import { getLyricsFromLRCLib } from "./lrclib-client";

type LyricsDeltaCallback = (delta: {
	processed: number;
	found: number;
	notFound: number;
}) => Promise<void>;

export async function fetchLyricsForPendingTracks(
	userId: string,
	onProgress?: (progress: LyricsProgress) => Promise<void>,
): Promise<LyricsProgress> {
	const stats: LyricsProgress = {
		found: 0,
		notFound: 0,
		processed: 0,
		total: 0,
	};
	const limit = pLimit(LYRICS_CONCURRENCY);

	const userTrackIds = db
		.select({ trackId: userTracks.trackId })
		.from(userTracks)
		.where(eq(userTracks.userId, userId));

	const lyricsPendingPredicate = and(
		inArray(track.id, userTrackIds),
		or(eq(track.lyricsStatus, "pending"), isNull(track.lyricsStatus)),
		isNull(track.lyrics),
	);

	const [countRow] = await db
		.select({ totalPending: count() })
		.from(track)
		.where(lyricsPendingPredicate);

	const totalPending = Number(countRow?.totalPending ?? 0);
	stats.total = totalPending;

	if (totalPending === 0) {
		logger.info({ userId }, "No tracks pending lyrics fetch");
		return stats;
	}

	for (;;) {
		const pendingTracks = await db
			.select()
			.from(track)
			.where(lyricsPendingPredicate)
			.limit(LYRICS_BATCH_SIZE);

		if (pendingTracks.length === 0) break;

		logger.info(
			{ userId, batchSize: pendingTracks.length, processed: stats.processed },
			"Fetching lyrics batch from LRCLib",
		);

		const batchStartTime = Date.now();

		const tasks = pendingTracks.map((t) =>
			limit(async () => {
				const artistNames: string[] = t.artistNames
					? JSON.parse(t.artistNames)
					: [];
				const primaryArtist = artistNames[0] ?? "";

				if (!t.name || !primaryArtist) {
					try {
						await db
							.update(track)
							.set({
								lyricsStatus: "not_found",
								lyricsFetchedAt: new Date(),
							})
							.where(eq(track.id, t.id));
						stats.notFound++;
						stats.processed++;
					} catch (err) {
						logger.warn(
							{
								trackId: t.id,
								error: err instanceof Error ? err.message : String(err),
							},
							"Failed to mark track missing metadata for lyrics skip",
						);
					}
					return;
				}

				try {
					const lyrics = await getLyricsFromLRCLib({
						trackName: t.name,
						artistName: primaryArtist,
						albumName: t.albumName,
						durationMs: t.durationMs,
					});

					if (!lyrics) {
						await db
							.update(track)
							.set({
								lyricsStatus: "not_found",
								lyricsFetchedAt: new Date(),
							})
							.where(eq(track.id, t.id));
						stats.notFound++;
					} else {
						await db
							.update(track)
							.set({
								lyrics: lyrics.plainLyrics,
								syncedLyrics: lyrics.syncedLyrics,
								lyricsInstrumental: lyrics.instrumental,
								lrclibId: lyrics.id,
								lyricsStatus: "found",
								lyricsFetchedAt: new Date(),
							})
							.where(eq(track.id, t.id));
						stats.found++;
					}
				} catch (err) {
					logger.warn(
						{
							trackId: t.id,
							error: err instanceof Error ? err.message : String(err),
						},
						"Failed to fetch lyrics after retries; marking not_found",
					);
					await db
						.update(track)
						.set({
							lyricsStatus: "not_found",
							lyricsFetchedAt: new Date(),
						})
						.where(eq(track.id, t.id));
					stats.notFound++;
				}

				stats.processed++;
			}),
		);

		await Promise.all(tasks);

		const batchDuration = Date.now() - batchStartTime;
		const throughput = Math.round(
			pendingTracks.length / (batchDuration / 1000),
		);
		logger.info(
			{
				userId,
				batchSize: pendingTracks.length,
				batchDuration: `${batchDuration}ms`,
				throughput: `${throughput}/s`,
			},
			"Completed lyrics batch processing",
		);

		if (onProgress) {
			await onProgress(stats);
		}
	}

	logger.info(
		{ userId, ...stats },
		"Completed lyrics fetch for all pending tracks",
	);

	return stats;
}

/**
 * Fetches lyrics for an explicit list of track IDs (fan-out worker entry point).
 * Re-checks the pending predicate at the DB level for idempotency — tracks already
 * processed by a previous attempt are silently skipped.
 * Calls onBatchComplete with deltas (not cumulative totals) after each internal batch
 * so workers can issue atomic incrementStageProgress calls.
 */
export async function fetchLyricsForTrackIds(
	userId: string,
	trackIds: string[],
	onBatchComplete?: LyricsDeltaCallback,
): Promise<LyricsProgress> {
	const stats: LyricsProgress = {
		found: 0,
		notFound: 0,
		processed: 0,
		total: trackIds.length,
	};

	if (trackIds.length === 0) return stats;

	const batches = chunk(trackIds, LYRICS_BATCH_SIZE);
	const limit = pLimit(LYRICS_CONCURRENCY);

	for (const batchIds of batches) {
		// Re-check pending predicate — idempotency guard for coordinator retries
		const pendingTracks = await db
			.select()
			.from(track)
			.where(
				and(
					inArray(track.id, batchIds),
					or(eq(track.lyricsStatus, "pending"), isNull(track.lyricsStatus)),
					isNull(track.lyrics),
				),
			);

		if (pendingTracks.length === 0) continue;

		// Snapshot stats before this batch to compute deltas after
		const prevProcessed = stats.processed;
		const prevFound = stats.found;
		const prevNotFound = stats.notFound;

		const tasks = pendingTracks.map((t) =>
			limit(async () => {
				const artistNames: string[] = t.artistNames
					? JSON.parse(t.artistNames)
					: [];
				const primaryArtist = artistNames[0] ?? "";

				if (!t.name || !primaryArtist) {
					try {
						await db
							.update(track)
							.set({ lyricsStatus: "not_found", lyricsFetchedAt: new Date() })
							.where(eq(track.id, t.id));
						stats.notFound++;
						stats.processed++;
					} catch (err) {
						logger.warn(
							{
								trackId: t.id,
								error: err instanceof Error ? err.message : String(err),
							},
							"Failed to mark track missing metadata for lyrics skip",
						);
					}
					return;
				}

				try {
					const lyrics = await getLyricsFromLRCLib({
						trackName: t.name,
						artistName: primaryArtist,
						albumName: t.albumName,
						durationMs: t.durationMs,
					});

					if (!lyrics) {
						await db
							.update(track)
							.set({ lyricsStatus: "not_found", lyricsFetchedAt: new Date() })
							.where(eq(track.id, t.id));
						stats.notFound++;
					} else {
						await db
							.update(track)
							.set({
								lyrics: lyrics.plainLyrics,
								syncedLyrics: lyrics.syncedLyrics,
								lyricsInstrumental: lyrics.instrumental,
								lrclibId: lyrics.id,
								lyricsStatus: "found",
								lyricsFetchedAt: new Date(),
							})
							.where(eq(track.id, t.id));
						stats.found++;
					}
				} catch (err) {
					logger.warn(
						{
							trackId: t.id,
							error: err instanceof Error ? err.message : String(err),
						},
						"Failed to fetch lyrics after retries; marking not_found",
					);
					await db
						.update(track)
						.set({ lyricsStatus: "not_found", lyricsFetchedAt: new Date() })
						.where(eq(track.id, t.id));
					stats.notFound++;
				}

				stats.processed++;
			}),
		);

		await Promise.all(tasks);

		await onBatchComplete?.({
			processed: stats.processed - prevProcessed,
			found: stats.found - prevFound,
			notFound: stats.notFound - prevNotFound,
		});
	}

	logger.info({ userId, ...stats }, "fetchLyricsForTrackIds completed");
	return stats;
}
