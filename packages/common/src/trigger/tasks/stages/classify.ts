import { db } from "@harmonia/db";
import { track, userTracks } from "@harmonia/db/schema/track";
import { logger } from "@harmonia/logger";
import { queue, task } from "@trigger.dev/sdk";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { classifyTrackIds } from "../../../services/brain";
import {
	checkCancelled,
	incrementStageProgress,
	updateRun,
	updateStageProgress,
} from "../../../services/organize";
import { chunk, workerIdempotencyKey } from "../../utils/chunk";

// 200 tracks/worker → ~34 LLM batches of 6. Peak Groq calls ≈
// CLASSIFY_WORKER_QUEUE_CONCURRENCY × CLASSIFICATION_CONCURRENCY (services/brain/classifier.ts).
const CLASSIFY_FANOUT_CHUNK_SIZE = 200;
const CLASSIFY_WORKER_QUEUE_CONCURRENCY = 2;

const classifyWorkerQueue = queue({
	name: "organize-classify-worker",
	concurrencyLimit: CLASSIFY_WORKER_QUEUE_CONCURRENCY,
});

// ── Worker ────────────────────────────────────────────────────────────────────

export const classifyWorkerTask = task({
	id: "organize-worker-classify",
	queue: classifyWorkerQueue,
	retry: { maxAttempts: 1 },
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

		return await classifyTrackIds(
			userId,
			trackIds,
			async (deltaClassified) => {
				await incrementStageProgress(
					runId,
					"classify",
					"classified",
					deltaClassified,
				);
			},
			runId,
		);
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
			chunks.map((trackIds, index) => ({
				payload: { userId, runId, trackIds },
				options: {
					idempotencyKey: workerIdempotencyKey(
						"classify-worker",
						runId,
						trackIds,
					),
					idempotencyKeyTTL: "24h",
					// Stagger the first two slots so workers don't all hit Groq at t=0.
					// Workers beyond index 2 are queue-gated by concurrencyLimit anyway.
					...(index > 0 && index <= 2 && { delay: `${index * 10}s` }),
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
