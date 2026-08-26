import { db } from "@harmonia/db";
import { track, userTracks } from "@harmonia/db/schema/track";
import { logger } from "@harmonia/logger";
import { queue, task } from "@trigger.dev/sdk";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { fetchAudioFeaturesForTrackIds } from "../../../services/music";
import {
	checkCancelled,
	incrementStageProgress,
	updateRun,
	updateStageProgress,
} from "../../../services/organize";
import { chunk, workerIdempotencyKey } from "../../utils/chunk";

/** Audio features: 500 tracks/worker, pLimit(3), 2 concurrent workers → 6 peak GetSongBPM requests. */
const AUDIO_FEATURES_FANOUT_CHUNK_SIZE = 500;
const AUDIO_FEATURES_WORKER_QUEUE_CONCURRENCY = 2;

const audioFeaturesWorkerQueue = queue({
	name: "organize-audio-features-worker",
	concurrencyLimit: AUDIO_FEATURES_WORKER_QUEUE_CONCURRENCY,
});

// ── Worker ────────────────────────────────────────────────────────────────────

export const audioFeaturesWorkerTask = task({
	id: "organize-worker-audio-features",
	queue: audioFeaturesWorkerQueue,
	retry: { maxAttempts: 2, minTimeoutInMs: 2000, factor: 2 },
	maxDuration: 600,
	run: async ({
		userId,
		runId,
		trackIds,
	}: {
		userId: string;
		runId: number;
		trackIds: string[];
	}) => {
		await checkCancelled(runId, userId);

		return await fetchAudioFeaturesForTrackIds(
			userId,
			trackIds,
			async (delta) => {
				if (delta.processed > 0)
					await incrementStageProgress(
						runId,
						"audioFeatures",
						"processed",
						delta.processed,
					);
				if (delta.found > 0)
					await incrementStageProgress(
						runId,
						"audioFeatures",
						"found",
						delta.found,
					);
				if (delta.notFound > 0)
					await incrementStageProgress(
						runId,
						"audioFeatures",
						"notFound",
						delta.notFound,
					);
			},
			runId,
		);
	},
});

// ── Coordinator ───────────────────────────────────────────────────────────────

export const audioFeaturesStageTask = task({
	id: "organize-stage-audio-features",
	retry: { maxAttempts: 2, minTimeoutInMs: 2000, factor: 2 },
	run: async ({ userId, runId }: { userId: string; runId: number }) => {
		await checkCancelled(runId, userId);
		await updateRun(runId, { currentStage: "audioFeatures" });

		const userTrackIds = db
			.select({ trackId: userTracks.trackId })
			.from(userTracks)
			.where(eq(userTracks.userId, userId));

		const allPending = await db
			.select({ id: track.id })
			.from(track)
			.where(
				and(
					inArray(track.id, userTrackIds),
					or(
						eq(track.audioFeaturesStatus, "pending"),
						isNull(track.audioFeaturesStatus),
					),
					isNull(track.tempo),
				),
			);

		const total = allPending.length;

		// Write total once — workers atomically increment processed/found/notFound
		await updateStageProgress(runId, "audioFeatures", {
			found: 0,
			notFound: 0,
			processed: 0,
			total,
		});

		if (total === 0) return { found: 0, notFound: 0, processed: 0, total: 0 };

		const chunks = chunk(
			allPending.map((t) => t.id),
			AUDIO_FEATURES_FANOUT_CHUNK_SIZE,
		);

		const batchResult = await audioFeaturesWorkerTask.batchTriggerAndWait(
			chunks.map((trackIds) => ({
				payload: { userId, runId, trackIds },
				options: {
					idempotencyKey: workerIdempotencyKey(
						"audio-features-worker",
						runId,
						trackIds,
					),
					idempotencyKeyTTL: "24h",
				},
			})),
		);

		// Fan-in: aggregate results from successful workers
		let found = 0;
		let notFound = 0;
		let processed = 0;
		let failedWorkers = 0;

		for (const run of batchResult.runs) {
			if (run.ok) {
				found += run.output.found;
				notFound += run.output.notFound;
				processed += run.output.processed;
			} else {
				failedWorkers++;
			}
		}

		if (failedWorkers > 0) {
			logger.warn(
				{
					runId,
					userId,
					failedWorkers,
					totalWorkers: batchResult.runs.length,
				},
				"Some audio-features workers failed; affected tracks remain pending for next run",
			);
			// Workers atomically incremented progress as they ran; overwriting with the
			// partial in-memory tally would erase progress from failed-mid-way workers.
			// Leave DB state from atomic increments as authoritative.
		} else {
			// All workers succeeded — authoritative final write after fan-in
			await updateStageProgress(runId, "audioFeatures", {
				found,
				notFound,
				processed,
				total,
			});
		}

		return { found, notFound, processed, total };
	},
});
