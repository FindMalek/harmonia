import type { RouterClient } from "@orpc/server";

import { db } from "@harmonia/db";
import { account } from "@harmonia/db/schema/auth";
import { and, eq } from "drizzle-orm";

import { protectedProcedure, publicProcedure } from "../index";
import { todoRouter } from "./todo";
import { createOrganizeRouter } from "./organize";
import { pipelineRouter } from "./pipeline";
import { tracksRouter } from "./tracks";
import { clustersRouter } from "./clusters";
import { playlistsRouter } from "./playlists";
import { fetchLyricsForPendingTracks, syncLikedTracks } from "@harmonia/music";
import {
	classifyTracksBatch,
	embedTracksBatch,
	runClustering,
	generateClusterMetadata,
	generatePlaylists,
	matchNewTracksToPlaylists,
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
	hasSpotifyLinked: protectedProcedure.handler(async ({ context }) => {
		const userId = context.session.user.id;
		const rows = await db
			.select({ userId: account.userId })
			.from(account)
			.where(and(eq(account.userId, userId), eq(account.providerId, "spotify")))
			.limit(1);
		return { hasSpotify: rows.length > 0 };
	}),
	todo: todoRouter,
	organize: createOrganizeRouter({
		syncLikedTracks,
		fetchLyricsForPendingTracks,
		classifyTracksBatch,
		embedTracksBatch,
		runClustering,
		generateClusterMetadata,
		generatePlaylists,
		matchNewTracksToPlaylists,
	}),
	pipeline: pipelineRouter,
	tracks: tracksRouter,
	clusters: clustersRouter,
	playlists: playlistsRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
