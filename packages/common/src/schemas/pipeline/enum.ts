import {
	PIPELINE_STATUS_VALUES,
	type PipelineStatus,
} from "@harmonia/db/schema/pipeline-run";
import { z } from "zod";

export type { PipelineStatus } from "@harmonia/db/schema/pipeline-run";
export { PIPELINE_STATUS_VALUES } from "@harmonia/db/schema/pipeline-run";

/**
 * Zod enum for `pipeline_run.status`. Derived from the DB schema so the
 * column type and the runtime validator can never drift.
 */
export const pipelineStatusEnum = z.enum(PIPELINE_STATUS_VALUES);
export type PipelineStatusZod = z.infer<typeof pipelineStatusEnum>;

/** Statuses that mean the run is done and the client should stop polling. */
export const TERMINAL_PIPELINE_STATUSES: ReadonlySet<PipelineStatus> = new Set([
	"completed",
	"partial",
	"failed",
	"cancelled",
]);

/** Statuses that represent a worse-than-`completed` outcome. */
export const DEGRADED_PIPELINE_STATUSES: ReadonlySet<PipelineStatus> = new Set([
	"partial",
	"failed",
]);

export function isTerminalPipelineStatus(
	status: string | null | undefined,
): status is PipelineStatus {
	return (
		status != null && TERMINAL_PIPELINE_STATUSES.has(status as PipelineStatus)
	);
}

export function isDegradedPipelineStatus(
	status: string | null | undefined,
): status is PipelineStatus {
	return (
		status != null && DEGRADED_PIPELINE_STATUSES.has(status as PipelineStatus)
	);
}
