import type { AudioFeaturesProgress } from "@harmonia/common/types";
import { db } from "@harmonia/db";
import { track } from "@harmonia/db/schema/track";
import { logger } from "@harmonia/logger";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import pLimit from "p-limit";

import {
	AUDIO_FEATURES_BATCH_SIZE,
	AUDIO_FEATURES_CONCURRENCY,
} from "../../../constants/audio-features";
import { chunk } from "../../../trigger/utils/chunk";
import { parseJsonStringArray } from "../../../utils/parse-json-string-array";
import { getAudioFeaturesFromGetSongBPM } from "./getsongbpm-client";

type AudioFeaturesDeltaCallback = (delta: {
	processed: number;
	found: number;
	notFound: number;
}) => Promise<void>;

/**
 * Fetches audio features for an explicit list of track IDs (fan-out worker entry point).
 * Re-checks the pending predicate at the DB level for idempotency — tracks already
 * processed by a previous attempt are silently skipped. Mirrors fetchLyricsForTrackIds.
 */
export async function fetchAudioFeaturesForTrackIds(
	userId: string,
	trackIds: string[],
	onBatchComplete?: AudioFeaturesDeltaCallback,
	pipelineRunId?: number,
): Promise<AudioFeaturesProgress> {
	const stats: AudioFeaturesProgress = {
		found: 0,
		notFound: 0,
		processed: 0,
		total: trackIds.length,
	};

	if (trackIds.length === 0) return stats;

	const batches = chunk(trackIds, AUDIO_FEATURES_BATCH_SIZE);
	const limit = pLimit(AUDIO_FEATURES_CONCURRENCY);

	for (const batchIds of batches) {
		const pendingTracks = await db
			.select()
			.from(track)
			.where(
				and(
					inArray(track.id, batchIds),
					or(
						eq(track.audioFeaturesStatus, "pending"),
						isNull(track.audioFeaturesStatus),
					),
					isNull(track.tempo),
				),
			);

		if (pendingTracks.length === 0) continue;

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
							.set({
								audioFeaturesStatus: "not_found",
								audioFeaturesFetchedAt: new Date(),
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
							"Failed to mark track missing metadata for audio-features skip",
						);
					}
					return;
				}

				try {
					const features = await getAudioFeaturesFromGetSongBPM(
						{ trackName: t.name, artistName: primaryArtist },
						{ userId, pipelineRunId },
					);

					if (!features) {
						await db
							.update(track)
							.set({
								audioFeaturesStatus: "not_found",
								audioFeaturesFetchedAt: new Date(),
							})
							.where(eq(track.id, t.id));
						stats.notFound++;
					} else {
						await db
							.update(track)
							.set({
								tempo: features.tempo,
								key: features.key,
								mode: features.mode,
								danceability: features.danceability,
								acousticness: features.acousticness,
								audioFeaturesStatus: "found",
								audioFeaturesFetchedAt: new Date(),
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
						"Failed to fetch audio features after retries; marking not_found",
					);
					await db
						.update(track)
						.set({
							audioFeaturesStatus: "not_found",
							audioFeaturesFetchedAt: new Date(),
						})
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

	logger.info({ userId, ...stats }, "fetchAudioFeaturesForTrackIds completed");
	return stats;
}
