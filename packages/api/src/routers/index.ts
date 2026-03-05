import type { RouterClient } from "@orpc/server";

import { protectedProcedure, publicProcedure } from "../index";
import { todoRouter } from "./todo";
import { createOrganizeRouter } from "./organize";

// Temporary no-op implementations; will be wired to real pipeline
// functions in packages/music and packages/brain.
const noOp = async () => {};

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
		syncLikedTracks: async () => noOp(),
		fetchLyricsForPendingTracks: async () => noOp(),
		classifyTracksBatch: async () => noOp(),
		embedTracksBatch: async () => noOp(),
		runClustering: async () => noOp(),
	}),
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
