import {
	emptyInput,
	spotifyLibraryStatsSchema,
} from "@harmonia/common/schemas";
import { getSpotifyLibraryStats, syncLibraryTracks } from "@harmonia/common";
import { db } from "@harmonia/db";
import { user } from "@harmonia/db/schema/auth";
import { eq } from "drizzle-orm";
import { protectedProcedure } from "../../procedures";
import { z } from "zod";

export const spotifyRouter = {
	libraryStats: protectedProcedure
		.input(emptyInput)
		.output(spotifyLibraryStatsSchema)
		.handler(async ({ context }) => {
			const userId = context.session.user.id;
			return getSpotifyLibraryStats(userId);
		}),

	syncLibrary: protectedProcedure
		.input(emptyInput)
		.output(
			z.object({
				total: z.number(),
				done: z.boolean(),
				stats: spotifyLibraryStatsSchema.optional(),
			}),
		)
		.handler(async ({ context }) => {
			const userId = context.session.user.id;
			const result = await syncLibraryTracks(userId);

			await db
				.update(user)
				.set({ hasCompletedOnboarding: true })
				.where(eq(user.id, userId));

			return result;
		}),
};
