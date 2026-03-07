import {
	organizeRunInput,
	organizeRunOutputSchema,
} from "@harmonia/common/schemas";
import { runOrganizeForUser } from "@harmonia/common/services/organize";
import { db } from "@harmonia/db";
import { user } from "@harmonia/db/schema/auth";
import { logger } from "@harmonia/logger";
import { ORPCError } from "@orpc/server";

import { cronOrAuthProcedure } from "../../procedures";

/**
 * Organize pipeline: syncs Spotify, fetches lyrics, classifies, embeds, clusters, generates playlists.
 *
 * 3rd party cron: POST {API_URL}/api/rpc/organize/run
 * Headers: Authorization: Bearer <CRON_SECRET> or X-Organize-Secret: <CRON_SECRET>
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
					"Syncs Spotify, fetches lyrics, classifies with AI, generates embeddings, clusters tracks, and generates playlists. Requires auth or Authorization: Bearer CRON_SECRET / X-Organize-Secret header. Cron mode runs for all users.",
				tags: ["organize"],
			},
		})
		.input(organizeRunInput)
		.output(organizeRunOutputSchema)
		.handler(async ({ context }) => {
			logger.info({ caller: context.caller }, "organize.run invoked");

			if (context.caller === "user") {
				try {
					const result = await runOrganizeForUser({
						userId: context.userId!,
					});
					return { success: true, results: [result] };
				} catch (err) {
					const message =
						err instanceof Error
							? err.message
							: "Failed to run organize pipeline";
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
					const result = await runOrganizeForUser({ userId: id });
					results.push(result);
				} catch (err) {
					const error = err instanceof Error ? err : new Error(String(err));
					logger.error(
						{ userId: id, error: error.message },
						"Organize failed for user",
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
