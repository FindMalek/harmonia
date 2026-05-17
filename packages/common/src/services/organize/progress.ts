import type { PipelineProgress } from "@harmonia/common/types";
import { db } from "@harmonia/db";
import { pipelineRun } from "@harmonia/db/schema/pipeline-run";
import { eq, sql } from "drizzle-orm";

/**
 * Atomically increments a single numeric field inside progress->{stage}->{field}.
 * Uses a single jsonb_set with a PostgreSQL array-literal path so Drizzle doesn't
 * need to parameterise the path components individually (avoids the ARRAY[$1,$2]
 * construct that can confuse some drivers). The path string is built from TypeScript
 * union-type values — never user input — so the inline interpolation is safe.
 *
 * Postgres UPDATE row-level locking serialises concurrent workers: the SET
 * expression re-reads the committed row value after acquiring the lock, so
 * concurrent calls accumulate correctly without losing updates.
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
	// stage/field come from TypeScript union types — safe to inline as SQL literals.
	// sql.raw avoids parameterising the -> / ->> JSON operators, which the Neon
	// serverless driver can mishandle when the key is bound as a $N parameter.
	const pathLiteral = sql.raw(`'{${stage},${field}}'`); // e.g. '{lyrics,processed}'
	const stageLiteral = sql.raw(`'${stage}'`); // e.g. 'lyrics'
	const fieldLiteral = sql.raw(`'${field}'`); // e.g. 'processed'

	await db
		.update(pipelineRun)
		.set({
			progress: sql<PipelineProgress>`
				jsonb_set(
					COALESCE(progress, '{}'::jsonb),
					${pathLiteral}::text[],
					to_jsonb(
						COALESCE(
							(COALESCE(progress, '{}'::jsonb)->${stageLiteral}->>${fieldLiteral})::int,
							0
						) + ${delta}
					),
					true
				)
			`,
		})
		.where(eq(pipelineRun.id, runId));
}
