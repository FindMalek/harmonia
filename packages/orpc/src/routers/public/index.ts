import {
	classifyTracksBatch,
	embedTracksBatch,
	fetchLyricsForPendingTracks,
	generateClusterMetadata,
	generatePlaylists,
	matchNewTracksToPlaylists,
	runClustering,
	syncLikedTracks,
} from "@harmonia/common";
import { publicProcedure } from "../../procedures";
import { createOrganizeRouter } from "./organize";

export function createPublicRouter(deps?: {
	syncLikedTracks?: typeof syncLikedTracks;
	fetchLyricsForPendingTracks?: typeof fetchLyricsForPendingTracks;
	classifyTracksBatch?: typeof classifyTracksBatch;
	embedTracksBatch?: typeof embedTracksBatch;
	runClustering?: typeof runClustering;
	generateClusterMetadata?: typeof generateClusterMetadata;
	generatePlaylists?: typeof generatePlaylists;
	matchNewTracksToPlaylists?: typeof matchNewTracksToPlaylists;
}) {
	return {
		healthCheck: publicProcedure.handler(() => {
			return "OK";
		}),
		organize: createOrganizeRouter({
			syncLikedTracks: deps?.syncLikedTracks ?? syncLikedTracks,
			fetchLyricsForPendingTracks:
				deps?.fetchLyricsForPendingTracks ?? fetchLyricsForPendingTracks,
			classifyTracksBatch: deps?.classifyTracksBatch ?? classifyTracksBatch,
			embedTracksBatch: deps?.embedTracksBatch ?? embedTracksBatch,
			runClustering: deps?.runClustering ?? runClustering,
			generateClusterMetadata:
				deps?.generateClusterMetadata ?? generateClusterMetadata,
			generatePlaylists: deps?.generatePlaylists ?? generatePlaylists,
			matchNewTracksToPlaylists:
				deps?.matchNewTracksToPlaylists ?? matchNewTracksToPlaylists,
		}),
	};
}

export const publicRouter = createPublicRouter();
export type PublicRouter = typeof publicRouter;
