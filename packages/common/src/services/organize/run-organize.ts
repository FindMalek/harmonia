import { db } from "@harmonia/db";
import {
	type PipelineProgress,
	type PipelineStatus,
	pipelineRun,
} from "@harmonia/db/schema/pipeline-run";
import { and, eq, sql } from "drizzle-orm";

export class PipelineCancelledError extends Error {
	constructor() {
		super("Pipeline run was cancelled");
		this.name = "PipelineCancelledError";
	}
}

export async function checkCancelled(
	runId: number,
	userId: string,
): Promise<void> {
	const [run] = await db
		.select({ status: pipelineRun.status })
		.from(pipelineRun)
		.where(and(eq(pipelineRun.id, runId), eq(pipelineRun.userId, userId)));
	if (run?.status === "cancelled") {
		throw new PipelineCancelledError();
	}
}

export async function updateRun(
	runId: number,
	data: {
		status?: PipelineStatus;
		currentStage?: string | null;
		progress?: PipelineProgress;
		error?: string | null;
		startedAt?: Date;
		completedAt?: Date;
	},
) {
	await db.update(pipelineRun).set(data).where(eq(pipelineRun.id, runId));
}

export async function updateStageProgress<K extends keyof PipelineProgress>(
	runId: number,
	stage: K,
	progress: PipelineProgress[K],
): Promise<void> {
	const stageUpdate = JSON.stringify({ [stage]: progress });
	await db
		.update(pipelineRun)
		.set({
			progress: sql<PipelineProgress>`COALESCE(progress, '{}'::jsonb) || ${stageUpdate}::jsonb`,
		})
		.where(eq(pipelineRun.id, runId));
}
