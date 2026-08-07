import { db } from "@harmonia/db";
import { track, userTracks } from "@harmonia/db/schema/track";
import { logger } from "@harmonia/logger";
import { queue, task } from "@trigger.dev/sdk";
import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { embedTrackIds } from "../../../services/brain";
import {
	checkCancelled,
	incrementStageProgress,
	updateRun,
	updateStageProgress,
} from "../../../services/organize";
import { chunk, workerIdempotencyKey } from "../../utils/chunk";

// 512 tracks/worker → 2 OpenAI batches of 256, pLimit(3) → ~4s/worker.
const EMBED_FANOUT_CHUNK_SIZE = 512;
const EMBED_WORKER_QUEUE_CONCURRENCY = 5;

const embedWorkerQueue = queue({
	name: "organize-embed-worker",
	concurrencyLimit: EMBED_WORKER_QUEUE_CONCURRENCY,
});

// ── Worker ────────────────────────────────────────────────────────────────────

export const embedWorkerTask = task({
	id: "organize-worker-embed",
	queue: embedWorkerQueue,
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

		return await embedTrackIds(
			userId,
			trackIds,
			async (deltaEmbedded) => {
				await incrementStageProgress(runId, "embed", "embedded", deltaEmbedded);
			},
			runId,
		);
	},
});

// ── Coordinator ───────────────────────────────────────────────────────────────

export const embedStageTask = task({
	id: "organize-stage-embed",
	retry: { maxAttempts: 2, minTimeoutInMs: 2000, factor: 2 },
	run: async ({ userId, runId }: { userId: string; runId: number }) => {
		await checkCancelled(runId, userId);
		await updateRun(runId, { currentStage: "embed" });

		// Only embed tracks that have been classified (llmClassifiedAt IS NOT NULL)
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
					isNull(track.embedding),
					isNotNull(track.llmClassifiedAt),
				),
			);

		const total = allPending.length;

		await updateStageProgress(runId, "embed", {
			embedded: 0,
			total,
			pending: total,
		});

		if (total === 0) return { embedded: 0, total: 0, pending: 0 };

		const chunks = chunk(
			allPending.map((t) => t.id),
			EMBED_FANOUT_CHUNK_SIZE,
		);

		const batchResult = await embedWorkerTask.batchTriggerAndWait(
			chunks.map((trackIds) => ({
				payload: { userId, runId, trackIds },
				options: {
					idempotencyKey: workerIdempotencyKey("embed-worker", runId, trackIds),
					idempotencyKeyTTL: "24h",
				},
			})),
		);

		let embedded = 0;
		let failedWorkers = 0;

		for (const run of batchResult.runs) {
			if (run.ok) {
				embedded += run.output.embedded;
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
				"Some embed workers failed; affected tracks remain pending for next run",
			);
		} else {
			await updateStageProgress(runId, "embed", {
				embedded,
				total,
				pending: total - embedded,
			});
		}

		return { embedded, total, pending: total - embedded };
	},
});
