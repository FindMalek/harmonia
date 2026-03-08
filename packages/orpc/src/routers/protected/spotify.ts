import {
	emptyInput,
	spotifyLibraryStatsSchema,
} from "@harmonia/common/schemas";
import { getSpotifyLibraryStats } from "@harmonia/common";
import { protectedProcedure } from "../../procedures";

export const spotifyRouter = {
	libraryStats: protectedProcedure
		.input(emptyInput)
		.output(spotifyLibraryStatsSchema)
		.handler(async ({ context }) => {
			const userId = context.session.user.id;
			return getSpotifyLibraryStats(userId);
		}),
};
