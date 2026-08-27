import { db } from "@sonaraem/db";
import { track, userTracks } from "@sonaraem/db/schema/track";
import { logger } from "@sonaraem/logger";
import { queue, task } from "@trigger.dev/sdk";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { fetchLyricsForTrackIds } from "../../../services/music";
import {
	checkCancelled,
	incrementStageProgress,
	updateRun,
	updateStageProgress,
} from "../../../services/organize";
import { chunk, workerIdempotencyKey } from "../../utils/chunk";

// 500 tracks/worker, pLimit(3), 2 concurrent workers → 6 peak LRCLib requests.
const LYRICS_FANOUT_CHUNK_SIZE = 500;
const LYRICS_WORKER_QUEUE_CONCURRENCY = 2;

const lyricsWorkerQueue = queue({
	name: "organize-lyrics-worker",
	concurrencyLimit: LYRICS_WORKER_QUEUE_CONCURRENCY,
});

// ── Worker ────────────────────────────────────────────────────────────────────

export const lyricsWorkerTask = task({
	id: "organize-worker-lyrics",
	queue: lyricsWorkerQueue,
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

		return await fetchLyricsForTrackIds(
			userId,
			trackIds,
			async (delta) => {
				if (delta.processed > 0)
					await incrementStageProgress(
						runId,
						"lyrics",
						"processed",
						delta.processed,
					);
				if (delta.found > 0)
					await incrementStageProgress(runId, "lyrics", "found", delta.found);
				if (delta.notFound > 0)
					await incrementStageProgress(
						runId,
						"lyrics",
						"notFound",
						delta.notFound,
					);
			},
			runId,
		);
	},
});

// ── Coordinator ───────────────────────────────────────────────────────────────

export const lyricsStageTask = task({
	id: "organize-stage-lyrics",
	retry: { maxAttempts: 2, minTimeoutInMs: 2000, factor: 2 },
	run: async ({ userId, runId }: { userId: string; runId: number }) => {
		await checkCancelled(runId, userId);
		await updateRun(runId, { currentStage: "lyrics" });

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
					or(eq(track.lyricsStatus, "pending"), isNull(track.lyricsStatus)),
					isNull(track.lyrics),
				),
			);

		const total = allPending.length;

		// Write total once — workers atomically increment processed/found/notFound
		await updateStageProgress(runId, "lyrics", {
			found: 0,
			notFound: 0,
			processed: 0,
			total,
		});

		if (total === 0) return { found: 0, notFound: 0, processed: 0, total: 0 };

		const chunks = chunk(
			allPending.map((t) => t.id),
			LYRICS_FANOUT_CHUNK_SIZE,
		);

		const batchResult = await lyricsWorkerTask.batchTriggerAndWait(
			chunks.map((trackIds) => ({
				payload: { userId, runId, trackIds },
				options: {
					idempotencyKey: workerIdempotencyKey(
						"lyrics-worker",
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
				"Some lyrics workers failed; affected tracks remain pending for next run",
			);
			// Workers atomically incremented progress as they ran; overwriting with the
			// partial in-memory tally would erase progress from failed-mid-way workers.
			// Leave DB state from atomic increments as authoritative.
		} else {
			// All workers succeeded — authoritative final write after fan-in
			await updateStageProgress(runId, "lyrics", {
				found,
				notFound,
				processed,
				total,
			});
		}

		return { found, notFound, processed, total };
	},
});
