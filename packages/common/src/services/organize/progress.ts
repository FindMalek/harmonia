import type { PipelineProgress } from "@harmonia/common/types";
import { db } from "@harmonia/db";
import { pipelineRun } from "@harmonia/db/schema/pipeline-run";
import { eq, sql } from "drizzle-orm";

const STAGE_DEFAULTS: Record<string, string> = {
	lyrics: '{"found":0,"notFound":0,"processed":0,"total":0}',
	classify: '{"classified":0,"total":0,"pending":0}',
	embed: '{"embedded":0,"total":0,"pending":0}',
};

/**
 * Atomically increments a single numeric field inside progress->{stage}->{field}
 * using jsonb_set. Safe for concurrent workers writing to the same runId.
 *
 * The outer jsonb_set ensures the stage key exists (creates with zero-filled defaults
 * if absent). The inner jsonb_set reads the current field value, coalesces to 0,
 * and adds delta. Postgres UPDATE row-level locking serializes concurrent calls.
 *
 * stage/field/defaultJson are hardcoded string literals — never user input.
 * delta is a parameterized value ($1 in the generated SQL).
 */
type LyricsField = "found" | "notFound" | "processed" | "total";
type ClassifyField = "classified" | "total" | "pending";
type EmbedField = "embedded" | "total" | "pending";
type StageField = LyricsField | ClassifyField | EmbedField;

export async function incrementStageProgress(
	runId: number,
	stage: "lyrics" | "classify" | "embed",
	field: StageField,
	delta: number,
): Promise<void> {
	const defaultJson = STAGE_DEFAULTS[stage]!;

	await db
		.update(pipelineRun)
		.set({
			progress: sql<PipelineProgress>`
				jsonb_set(
					jsonb_set(
						COALESCE(progress, '{}'::jsonb),
						ARRAY[${stage}]::text[],
						COALESCE(progress->${stage}, ${defaultJson}::jsonb),
						true
					),
					ARRAY[${stage}, ${field}]::text[],
					to_jsonb(
						COALESCE(
							(COALESCE(progress, '{}'::jsonb)->${stage}->>${field})::int,
							0
						) + ${delta}
					),
					true
				)
			`,
		})
		.where(eq(pipelineRun.id, runId));
}
