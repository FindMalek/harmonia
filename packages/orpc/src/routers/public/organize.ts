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

import { cronOrAuthProcedure } from "../../procedures";

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
					const [run] = await db
						.insert(pipelineRun)
						.values({
							userId: context.userId,
							status: "running",
							currentStage: "sync",
							startedAt: new Date(),
						})
						.returning({ id: pipelineRun.id });

					if (!run) throw new Error("Failed to create run record");

					try {
						await organizePipeline.trigger({
							userId: context.userId,
							runId: run.id,
						});
					} catch (triggerErr) {
						const msg =
							triggerErr instanceof Error
								? triggerErr.message
								: String(triggerErr);
						await updateRun(run.id, {
							status: "failed",
							error: msg,
							completedAt: new Date(),
						});
						throw triggerErr;
					}

					return {
						success: true,
						results: [
							{ userId: context.userId, runId: run.id, status: "completed" },
						],
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
				status: "completed" | "failed";
				error?: string;
			}> = [];

			for (const { id } of users) {
				try {
					const [run] = await db
						.insert(pipelineRun)
						.values({
							userId: id,
							status: "running",
							currentStage: "sync",
							startedAt: new Date(),
						})
						.returning({ id: pipelineRun.id });

					if (!run) throw new Error("Failed to create run record");

					try {
						await organizePipeline.trigger({
							userId: id,
							runId: run.id,
						});
						results.push({ userId: id, runId: run.id, status: "completed" });
					} catch (triggerErr) {
						const error =
							triggerErr instanceof Error
								? triggerErr
								: new Error(String(triggerErr));
						await updateRun(run.id, {
							status: "failed",
							error: error.message,
							completedAt: new Date(),
						});
						logger.error(
							{ userId: id, runId: run.id, error: error.message },
							"Failed to queue organize for user",
						);
						results.push({
							userId: id,
							runId: run.id,
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
