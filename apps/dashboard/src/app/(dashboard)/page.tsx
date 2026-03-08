import {
	dehydrate,
	HydrationBoundary,
	QueryClient,
} from "@tanstack/react-query";
import { redirect } from "next/navigation";

import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { getServerSession } from "@/lib/get-server-session";
import { orpc } from "@/lib/orpc";

export const revalidate = 60;

export default async function DashboardPage() {
	const session = await getServerSession();

	if (!session?.user) {
		redirect("/login");
	}

	const queryClient = new QueryClient();
	await Promise.all([
		queryClient.prefetchQuery(
			orpc.spotify.libraryStats.queryOptions({ input: {} }),
		),
		queryClient.prefetchQuery(orpc.pipeline.stats.queryOptions({ input: {} })),
		queryClient.prefetchQuery(orpc.pipeline.getAll.queryOptions({ input: {} })),
		queryClient.prefetchQuery(
			orpc.hasSpotifyLinked.queryOptions({ input: {} }),
		),
	]);

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<DashboardOverview />
		</HydrationBoundary>
	);
}
