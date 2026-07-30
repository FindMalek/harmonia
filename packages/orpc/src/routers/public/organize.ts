import {
	organizeRunInput,
	organizeRunOutputSchema,
} from "@harmonia/common/schemas";
import { updateRun } from "@harmonia/common/services/organize";
import { organizePipeline } from "@harmonia/common/trigger/tasks/organize";
import { db } from "@harmonia/db";
import { user } from "@harmonia/db/schema/auth";
import { pipelineRun } from "@harmonia/db/schema/pipeline-run";
import { logger } from "@harmonia/logger";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";

import { cronOrAuthProcedure } from "../../procedures";

const RUNNING_CONSTRAINT_NAME = "pipeline_run_one_running_per_user";
const MAX_INSERT_ATTEMPTS = 3;

function isAlreadyRunningConflict(err: unknown): boolean {
	if (typeof err !== "object" || err === null) return false;
	if (!("code" in err) || !("constraint" in err)) return false;
	return err.code === "23505" && err.constraint === RUNNING_CONSTRAINT_NAME;
}

async function findRunningRunId(userId: string): Promise<number | null> {
	const [existing] = await db
		.select({ id: pipelineRun.id })
		.from(pipelineRun)
		.where(
			and(eq(pipelineRun.userId, userId), eq(pipelineRun.status, "running")),
		);
	return existing?.id ?? null;
}

type InsertRunResult =
	| { kind: "created"; runId: number }
	| { kind: "skipped"; runId: number };

/**
 * Inserts a new "running" pipeline_run row for the user, or reports the
 * existing one if the unique-running-per-user constraint blocks it. If the
 * conflicting run finishes between our insert attempt and the lookup (a
 * narrow but real race), the constraint has cleared — retry the insert
 * instead of dropping a valid request as "skipped".
 */
async function insertRunOrSkip(userId: string): Promise<InsertRunResult> {
	for (let attempt = 0; attempt < MAX_INSERT_ATTEMPTS; attempt++) {
		try {
			const [inserted] = await db
				.insert(pipelineRun)
				.values({
					userId,
					status: "running",
					currentStage: "sync",
					startedAt: new Date(),
				})
				.returning({ id: pipelineRun.id });

			if (!inserted) throw new Error("Failed to create run record");
			return { kind: "created", runId: inserted.id };
		} catch (err) {
			if (!isAlreadyRunningConflict(err)) throw err;

			const existingRunId = await findRunningRunId(userId);
			if (existingRunId !== null) {
				return { kind: "skipped", runId: existingRunId };
			}
			// Conflicting run finished between our insert and this lookup —
			// loop around and retry the insert now that it should be clear.
		}
	}
	throw new Error(
		`Failed to create pipeline run for user ${userId} after ${MAX_INSERT_ATTEMPTS} attempts (repeatedly raced with another run)`,
	);
}

/**
 * Organize pipeline: syncs Spotify, fetches lyrics, classifies, embeds, clusters, generates playlists.
 *
 * 3rd party cron: POST {API_URL}/api/rpc/organize/run
 * Headers: Authorization: Bearer <HARMONIA_CRON_SECRET> or X-Organize-Secret: <HARMONIA_CRON_SECRET>
 * Body: {}
 * Cron mode runs the pipeline for all users in the database.
 */
export const organizeRouter = {
	run: cronOrAuthProcedure
		.meta({
			openapi: {
				method: "POST",
				path: "/organize/run",
				summary: "Run full organize pipeline",
				description:
					"Syncs Spotify, fetches lyrics, classifies with AI, generates embeddings, clusters tracks, and generates playlists. Requires auth or Authorization: Bearer HARMONIA_CRON_SECRET / X-Organize-Secret header. Cron mode runs for all users.",
				tags: ["organize"],
			},
		})
		.input(organizeRunInput)
		.output(organizeRunOutputSchema)
		.handler(async ({ context }) => {
			logger.info({ caller: context.caller }, "organize.run invoked");

			if (context.caller === "user") {
				if (!context.userId) {
					throw new ORPCError("UNAUTHORIZED", {
						message: "User ID missing in auth context",
					});
				}
				try {
					const insertResult = await insertRunOrSkip(context.userId);

					if (insertResult.kind === "skipped") {
						logger.info(
							{ userId: context.userId, existingRunId: insertResult.runId },
							"organize.run skipped — a run is already in progress for this user",
						);
						return {
							success: true,
							results: [
								{
									userId: context.userId,
									runId: insertResult.runId,
									status: "skipped",
									error: "A pipeline run is already in progress",
								},
							],
						};
					}

					const runId = insertResult.runId;

					try {
						await organizePipeline.trigger({
							userId: context.userId,
							runId,
						});
					} catch (triggerErr) {
						const msg =
							triggerErr instanceof Error
								? triggerErr.message
								: String(triggerErr);
						await updateRun(runId, {
							status: "failed",
							error: msg,
							completedAt: new Date(),
						});
						throw triggerErr;
					}

					return {
						success: true,
						results: [{ userId: context.userId, runId, status: "completed" }],
					};
				} catch (err) {
					const message =
						err instanceof Error
							? err.message
							: "Failed to queue organize pipeline";
					throw new ORPCError("INTERNAL_SERVER_ERROR", { message });
				}
			}

			const users = await db.select({ id: user.id }).from(user);
			const results: Array<{
				userId: string;
				runId: number;
				status: "completed" | "failed" | "skipped";
				error?: string;
			}> = [];

			for (const { id } of users) {
				try {
					const insertResult = await insertRunOrSkip(id);

					if (insertResult.kind === "skipped") {
						logger.info(
							{ userId: id, existingRunId: insertResult.runId },
							"organize.run skipped for user — a run is already in progress",
						);
						results.push({
							userId: id,
							runId: insertResult.runId,
							status: "skipped",
							error: "A pipeline run is already in progress",
						});
						continue;
					}

					const runId = insertResult.runId;

					try {
						await organizePipeline.trigger({ userId: id, runId });
						results.push({ userId: id, runId, status: "completed" });
					} catch (triggerErr) {
						const error =
							triggerErr instanceof Error
								? triggerErr
								: new Error(String(triggerErr));
						await updateRun(runId, {
							status: "failed",
							error: error.message,
							completedAt: new Date(),
						});
						logger.error(
							{ userId: id, runId, error: error.message },
							"Failed to queue organize for user",
						);
						results.push({
							userId: id,
							runId,
							status: "failed",
							error: error.message,
						});
					}
				} catch (err) {
					const error = err instanceof Error ? err : new Error(String(err));
					logger.error(
						{ userId: id, error: error.message },
						"Failed to queue organize for user",
					);
					results.push({
						userId: id,
						runId: -1,
						status: "failed",
						error: error.message,
					});
				}
			}

			return { success: true, results };
		}),
};
