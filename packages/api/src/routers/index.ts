import type { RouterClient } from "@orpc/server";

import { protectedProcedure, publicProcedure } from "../index";
import { todoRouter } from "./todo";
import { createOrganizeRouter } from "./organize";
import { fetchLyricsForPendingTracks, syncLikedTracks } from "@harmonia/music";
import {
	classifyTracksBatch,
	embedTracksBatch,
	runClustering,
} from "@harmonia/brain";

export const appRouter = {
	healthCheck: publicProcedure.handler(() => {
		return "OK";
	}),
	privateData: protectedProcedure.handler(({ context }) => {
		return {
			message: "This is private",
			user: context.session?.user,
		};
	}),
	todo: todoRouter,
	organize: createOrganizeRouter({
		syncLikedTracks,
		fetchLyricsForPendingTracks,
		classifyTracksBatch,
		embedTracksBatch,
		runClustering,
	}),
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
