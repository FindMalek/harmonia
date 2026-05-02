import {
	HydrationBoundary,
	QueryClient,
	QueryClientProvider,
	dehydrate,
} from "@tanstack/react-query";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { DashboardLibraryOverviewSkeleton } from "@/components/app/dashboard-library-overview";
import { DashboardLibraryStatsWrapper } from "@/components/app/dashboard-library-stats-wrapper";
import { DashboardShell } from "@/components/app/dashboard-shell";
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
		queryClient.prefetchQuery(orpc.pipeline.stats.queryOptions({ input: {} })),
		queryClient.prefetchQuery(orpc.pipeline.getAll.queryOptions({ input: {} })),
	]);

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<DashboardShell>
				<Suspense fallback={<DashboardLibraryOverviewSkeleton />}>
					<DashboardLibraryStatsWrapper userId={session.user.id} />
				</Suspense>
			</DashboardShell>
		</HydrationBoundary>
	);
}
