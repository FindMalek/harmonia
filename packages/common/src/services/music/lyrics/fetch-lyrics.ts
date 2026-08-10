import type { LyricsProgress } from "@harmonia/common/types";
import { db } from "@harmonia/db";
import { track } from "@harmonia/db/schema/track";
import { logger } from "@harmonia/logger";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import pLimit from "p-limit";

import { chunk } from "../../../trigger/utils/chunk";
import { parseJsonStringArray } from "../../../utils/parse-json-string-array";
import { getLyricsFromLRCLib } from "./lrclib-client";

const LYRICS_BATCH_SIZE = 200;
const LYRICS_CONCURRENCY = 3;

type LyricsDeltaCallback = (delta: {
	processed: number;
	found: number;
	notFound: number;
}) => Promise<void>;

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
	pipelineRunId?: number,
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
				const artistNames = parseJsonStringArray(t.artistNames);
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
					const lyrics = await getLyricsFromLRCLib(
						{
							trackName: t.name,
							artistName: primaryArtist,
							albumName: t.albumName,
							durationMs: t.durationMs,
						},
						{ userId, pipelineRunId },
					);

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
