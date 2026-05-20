import { db } from "@harmonia/db";
import { track, userTracks } from "@harmonia/db/schema/track";
import { logger } from "@harmonia/logger";
import { queue, task } from "@trigger.dev/sdk/v3";
import { and, eq, inArray, isNull } from "drizzle-orm";

import { classifyTrackIds } from "../../../services/brain";
import {
	checkCancelled,
	incrementStageProgress,
	updateRun,
	updateStageProgress,
} from "../../../services/organize";
import {
	CLASSIFY_FANOUT_CHUNK_SIZE,
	CLASSIFY_WORKER_QUEUE_CONCURRENCY,
} from "../../constants";
import { chunk, workerIdempotencyKey } from "../../utils/chunk";

const classifyWorkerQueue = queue({
	name: "organize-classify-worker",
	concurrencyLimit: CLASSIFY_WORKER_QUEUE_CONCURRENCY,
});

// ── Worker ────────────────────────────────────────────────────────────────────

export const classifyWorkerTask = task({
	id: "organize-worker-classify",
	queue: classifyWorkerQueue,
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

		return await classifyTrackIds(userId, trackIds, async (deltaClassified) => {
			await incrementStageProgress(
				runId,
				"classify",
				"classified",
				deltaClassified,
			);
		});
	},
});

// ── Coordinator ───────────────────────────────────────────────────────────────

export const classifyStageTask = task({
	id: "organize-stage-classify",
	retry: { maxAttempts: 2, minTimeoutInMs: 2000, factor: 2 },
	run: async ({ userId, runId }: { userId: string; runId: number }) => {
		await checkCancelled(runId, userId);
		await updateRun(runId, { currentStage: "classify" });

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
					isNull(track.llmClassifiedAt),
					inArray(track.lyricsStatus, ["found", "not_found"]),
				),
			);

		const total = allPending.length;

		await updateStageProgress(runId, "classify", {
			classified: 0,
			total,
			pending: total,
		});

		if (total === 0) return { classified: 0, total: 0, pending: 0 };

		const chunks = chunk(
			allPending.map((t) => t.id),
			CLASSIFY_FANOUT_CHUNK_SIZE,
		);

		const batchResult = await classifyWorkerTask.batchTriggerAndWait(
			chunks.map((trackIds) => ({
				payload: { userId, runId, trackIds },
				options: {
					idempotencyKey: workerIdempotencyKey(
						"classify-worker",
						runId,
						trackIds,
					),
					idempotencyKeyTTL: "24h",
				},
			})),
		);

		let classified = 0;
		let failedWorkers = 0;

		for (const run of batchResult.runs) {
			if (run.ok) {
				classified += run.output.classified;
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
				"Some classify workers failed; affected tracks remain pending for next run",
			);
		} else {
			await updateStageProgress(runId, "classify", {
				classified,
				total,
				pending: total - classified,
			});
		}

		return { classified, total, pending: total - classified };
	},
});
