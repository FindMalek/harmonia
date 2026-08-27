import { getSpotifyLibraryStats } from "@sonaraem/common";
import { DashboardLibraryOverview } from "./dashboard-library-overview";

export async function DashboardLibraryStatsWrapper({
	userId,
}: {
	userId: string;
}) {
	const stats = await getSpotifyLibraryStats(userId);

	return <DashboardLibraryOverview stats={stats} isLoading={false} />;
}
