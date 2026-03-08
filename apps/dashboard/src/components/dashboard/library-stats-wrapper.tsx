import { getSpotifyLibraryStats } from "@harmonia/common";
import { LibraryOverview } from "./library-overview";

/** Fetches library stats server-side. Uses getSpotifyLibraryStats (lightweight playlists-only fetch). */
export async function LibraryStatsWrapper({ userId }: { userId: string }) {
	const stats = await getSpotifyLibraryStats(userId);

	return <LibraryOverview stats={stats} isLoading={false} />;
}
