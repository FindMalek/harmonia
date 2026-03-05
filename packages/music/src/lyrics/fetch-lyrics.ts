import { db } from "@harmonia/db";
import { track } from "@harmonia/db/schema/track";
import { logger } from "@harmonia/logger";
import { and, eq, isNull, or } from "drizzle-orm";
import pLimit from "p-limit";

import { getLyricsFromLRCLib } from "./lrclib-client";

const LYRICS_BATCH_SIZE = 50;
const LYRICS_CONCURRENCY = 5;

export type LyricsProgress = {
	found: number;
	notFound: number;
	processed: number;
	total: number;
};

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

	for (;;) {
		const pendingTracks = await db
			.select()
			.from(track)
			.where(
				and(
					eq(track.userId, userId),
					or(eq(track.lyricsStatus, "pending"), isNull(track.lyricsStatus)),
				),
			)
			.limit(LYRICS_BATCH_SIZE);

		if (pendingTracks.length === 0) break;

		if (stats.total === 0) {
			stats.total = pendingTracks.length;
		}

		logger.info(
			{ userId, batchSize: pendingTracks.length, processed: stats.processed },
			"Fetching lyrics batch from LRCLib",
		);

		const tasks = pendingTracks.map((t) =>
			limit(async () => {
				const artistNames: string[] = JSON.parse(t.artistNames) ?? [];
				const primaryArtist = artistNames[0] ?? "";

				if (!t.name || !primaryArtist) {
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
							.where(and(eq(track.userId, userId), eq(track.id, t.id)));
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
							.where(and(eq(track.userId, userId), eq(track.id, t.id)));
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
						.where(and(eq(track.userId, userId), eq(track.id, t.id)));
					stats.notFound++;
				}

				stats.processed++;
			}),
		);

		await Promise.all(tasks);

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
