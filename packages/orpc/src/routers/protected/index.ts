import { db } from "@harmonia/db";
import { account } from "@harmonia/db/schema/auth";
import { and, eq } from "drizzle-orm";
import { protectedProcedure } from "../../index";
import { clustersRouter } from "./clusters";
import { pipelineRouter } from "./pipeline";
import { playlistsRouter } from "./playlists";
import { todoRouter } from "./todo";
import { tracksRouter } from "./tracks";

export const protectedRouter = {
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
	tracks: tracksRouter,
	clusters: clustersRouter,
	playlists: playlistsRouter,
	pipeline: pipelineRouter,
};

export type ProtectedRouter = typeof protectedRouter;
