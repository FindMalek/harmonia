import { z } from "zod";

import { publicProcedure } from "../index";
import type { Context } from "../context";

import { env } from "@harmonia/env/server";
import { ORPCError } from "@orpc/server";
import { logger } from "@harmonia/logger";

// These will be implemented in packages/music and packages/brain
// and imported here once available.
type SyncFn = (userId: string) => Promise<void>;

type PipelineDeps = {
	syncLikedTracks: SyncFn;
	fetchLyricsForPendingTracks: SyncFn;
	classifyTracksBatch: SyncFn;
	embedTracksBatch: SyncFn;
	runClustering: SyncFn;
};

export const createOrganizeRouter = ({
	syncLikedTracks,
	fetchLyricsForPendingTracks,
	classifyTracksBatch,
	embedTracksBatch,
	runClustering,
}: PipelineDeps) => {
	return {
		run: publicProcedure
			.meta({
				openapi: {
					method: "POST",
					path: "/organize/run",
					summary: "Run full organize pipeline",
					description:
						"Syncs Spotify, fetches lyrics (LRCLib), classifies with Groq LLM, generates OpenAI embeddings, and clusters. Requires auth or X-Organize-Secret header.",
					tags: ["organize"],
				},
			})
			.input(
				z.object({
					userId: z.string().optional(), // For cron: target user. For auth: ignored, uses session.
				}),
			)
			.handler(async ({ input, context }) => {
				logger.info({ input }, "organize.run invoked");

				const { userId } = await resolveUserId(input.userId, context);

				logger.info({ userId }, "Organize pipeline start");

				try {
					await syncLikedTracks(userId);
					await fetchLyricsForPendingTracks(userId);
					await classifyTracksBatch(userId);
					await embedTracksBatch(userId);
					await runClustering(userId);
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
					throw err;
				}

				logger.info({ userId }, "Organize pipeline completed successfully");

				return { success: true, userId };
			}),
	};
};

async function resolveUserId(
	inputUserId: string | undefined,
	context: Context,
): Promise<{ userId: string }> {
	const cronSecret = context.headers?.get("X-Organize-Secret");
	const allowedByCron = env.CRON_SECRET && cronSecret === env.CRON_SECRET;
	const allowedByAuth = context.session?.user?.id;

	if (!allowedByCron && !allowedByAuth) {
		logger.warn(
			{
				hasSession: !!context.session,
				hasCronHeader: !!cronSecret,
			},
			"Unauthorized organize.run attempt",
		);

		throw new ORPCError("UNAUTHORIZED");
	}

	const userId = allowedByAuth ?? inputUserId;
	if (!userId) {
		logger.warn(
			{ inputUserId },
			"userId required for cron organize.run but was not provided",
		);

		throw new ORPCError("BAD_REQUEST", { message: "userId required for cron" });
	}

	return { userId };
}
