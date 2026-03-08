import { getSpotifyLibraryStats } from "@harmonia/common";
import { LibraryOverview } from "./library-overview";

export async function LibraryStatsWrapper({ userId }: { userId: string }) {
	const stats = await getSpotifyLibraryStats(userId);

	return <LibraryOverview stats={stats} isLoading={false} />;
}
