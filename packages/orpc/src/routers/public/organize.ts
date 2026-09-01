import { ORPCError } from "@orpc/server";
import {
	organizeRunInput,
	organizeRunOutputSchema,
} from "@sonaraem/common/schemas";
import { updateRun } from "@sonaraem/common/services/organize";
import { organizePipeline } from "@sonaraem/common/trigger/tasks/organize";
import {
	insertRunOrSkip,
	runOrganizeForAllUsers,
} from "@sonaraem/common/trigger/tasks/organize-weekly-cron";
import { logger } from "@sonaraem/logger";

import { cronOrAuthProcedure } from "../../procedures";

/**
 * Organize pipeline: syncs Spotify, fetches lyrics, classifies, embeds, clusters, generates playlists.
 *
 * 3rd party cron: POST {API_URL}/api/rpc/organize/run
 * Headers: Authorization: Bearer <SONARAEM_CRON_SECRET> or X-Organize-Secret: <SONARAEM_CRON_SECRET>
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
					"Syncs Spotify, fetches lyrics, classifies with AI, generates embeddings, clusters tracks, and generates playlists. Requires auth or Authorization: Bearer SONARAEM_CRON_SECRET / X-Organize-Secret header. Cron mode runs for all users.",
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
					const insertResult = await insertRunOrSkip(context.userId, "user");

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

			const results = await runOrganizeForAllUsers();
			return { success: true, results };
		}),
};
