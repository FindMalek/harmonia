import { z } from "zod";

import { publicProcedure } from "../index";
import type { Context } from "../context";

import { ORPCError } from "@orpc/server";

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

const CRON_SECRET = process.env.CRON_SECRET;

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
				const { userId } = await resolveUserId(input.userId, context);

				await syncLikedTracks(userId);
				await fetchLyricsForPendingTracks(userId);
				await classifyTracksBatch(userId);
				await embedTracksBatch(userId);
				await runClustering(userId);

				return { success: true, userId };
			}),
	};
};

async function resolveUserId(
	inputUserId: string | undefined,
	context: Context,
): Promise<{ userId: string }> {
	const cronSecret = context.headers?.get("X-Organize-Secret");
	const allowedByCron = CRON_SECRET && cronSecret === CRON_SECRET;
	const allowedByAuth = context.session?.user?.id;

	if (!allowedByCron && !allowedByAuth) {
		throw new ORPCError("UNAUTHORIZED");
	}

	const userId = allowedByAuth ?? inputUserId;
	if (!userId) {
		throw new ORPCError("BAD_REQUEST", { message: "userId required for cron" });
	}

	return { userId };
}
