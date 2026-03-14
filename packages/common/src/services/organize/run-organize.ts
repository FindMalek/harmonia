import type { OrganizeRunResult } from "@harmonia/common/schemas";
import type {
	ClassifyProgress,
	ClusterProgress,
	EmbedProgress,
	GenerateProgress,
	LyricsProgress,
	SyncProgress,
} from "@harmonia/common/types";
import { db } from "@harmonia/db";
import {
	type PipelineProgress,
	pipelineRun,
} from "@harmonia/db/schema/pipeline-run";
import { logger } from "@harmonia/logger";
import { eq } from "drizzle-orm";
import {
	classifyTracksBatch,
	embedTracksBatch,
	generateClusterMetadata,
	generatePlaylists,
	matchNewTracksToPlaylists,
	runClustering,
} from "../brain";
import { fetchLyricsForPendingTracks, syncLibraryTracks } from "../music";

async function updateRun(
	runId: number,
	data: {
		status?: string;
		currentStage?: string | null;
		progress?: PipelineProgress;
		error?: string;
		startedAt?: Date;
		completedAt?: Date;
	},
) {
	await db.update(pipelineRun).set(data).where(eq(pipelineRun.id, runId));
}

export async function runOrganizeForUser({
	userId,
	runId: existingRunId,
}: {
	userId: string;
	runId?: number;
}): Promise<OrganizeRunResult> {
	let runId = existingRunId;

	if (!runId) {
		const [run] = await db
			.insert(pipelineRun)
			.values({
				userId,
				status: "running",
				currentStage: "sync",
				startedAt: new Date(),
			})
			.returning({ id: pipelineRun.id });

		if (!run) {
			throw new Error("Failed to create pipeline run");
		}
		runId = run.id;
	} else {
		// Update existing run status to running
		await updateRun(runId, {
			status: "running",
			currentStage: "sync",
			startedAt: new Date(),
		});
	}
	const progress: PipelineProgress = {};

	try {
		await updateRun(runId, { currentStage: "sync" });
		const syncResult = await syncLibraryTracks(
			userId,
			async (p: SyncProgress) => {
				progress.sync = p;
				await updateRun(runId, { progress });
			},
		);
		progress.sync = syncResult;
		await updateRun(runId, { progress });

		await updateRun(runId, { currentStage: "classify" });
		const classifyResult = await classifyTracksBatch(
			userId,
			async (p: ClassifyProgress) => {
				progress.classify = p;
				await updateRun(runId, { progress });
			},
		);
		progress.classify = classifyResult;
		await updateRun(runId, { progress });

		await updateRun(runId, { currentStage: "embed" });
		const embedResult = await embedTracksBatch(
			userId,
			async (p: EmbedProgress) => {
				progress.embed = p;
				await updateRun(runId, { progress });
			},
		);
		progress.embed = embedResult;
		await updateRun(runId, { progress });

		await updateRun(runId, { currentStage: "lyrics" });
		const lyricsResult = await fetchLyricsForPendingTracks(
			userId,
			async (p: LyricsProgress) => {
				progress.lyrics = p;
				await updateRun(runId, { progress });
			},
		);
		progress.lyrics = lyricsResult;
		await updateRun(runId, { progress });

		await updateRun(runId, { currentStage: "cluster" });
		const clusterResult = await runClustering(
			userId,
			async (p: ClusterProgress) => {
				progress.cluster = p;
				await updateRun(runId, { progress });
			},
		);
		progress.cluster = clusterResult;
		await updateRun(runId, { progress });

		await updateRun(runId, { currentStage: "generate" });
		await generateClusterMetadata(userId);
		const generateResult = await generatePlaylists(
			userId,
			async (p: GenerateProgress) => {
				progress.generate = p;
				await updateRun(runId, { progress });
			},
		);
		progress.generate = generateResult;
		await updateRun(runId, { progress });

		await matchNewTracksToPlaylists(userId);

		await updateRun(runId, {
			status: "completed",
			currentStage: null,
			progress,
			completedAt: new Date(),
		});

		logger.info({ userId, runId }, "Organize pipeline completed successfully");

		return { userId, runId, status: "completed" };
	} catch (err: unknown) {
		const error = err instanceof Error ? err : new Error(String(err));
		const cause =
			error.cause ??
			(err &&
				typeof err === "object" &&
				"cause" in err &&
				(err as { cause?: unknown }).cause);
		const causeMessage =
			cause instanceof Error
				? cause.message
				: cause != null
					? String(cause)
					: undefined;
		const safePayload = {
			message: error.message,
			stack: error.stack,
			...(causeMessage !== undefined && { causeMessage }),
		};
		logger.error(safePayload, "Organize pipeline failed");

		await updateRun(runId, {
			status: "failed",
			error: error.message,
			completedAt: new Date(),
		});

		return {
			userId,
			runId,
			status: "failed",
			error: error.message,
		};
	}
}
