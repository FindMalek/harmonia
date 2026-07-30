import {
	dehydrate,
	HydrationBoundary,
	QueryClient,
} from "@tanstack/react-query";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { DashboardLibraryOverviewSkeleton } from "@/components/app/dashboard-library-overview";
import { DashboardLibraryStatsWrapper } from "@/components/app/dashboard-library-stats-wrapper";
import { DashboardShell } from "@/components/app/dashboard-shell";
import { getServerSession } from "@/shared/api/session.server";
import {
	pipelineGetAllQueryOptions,
	pipelineStatsQueryOptions,
} from "@/shared/lib/pipeline/pipeline.util";

export default async function DashboardPage() {
	const session = await getServerSession();

	if (!session?.user) {
		redirect("/login");
	}

	const queryClient = new QueryClient();
	await Promise.all([
		queryClient.prefetchQuery(pipelineStatsQueryOptions()),
		queryClient.prefetchQuery(pipelineGetAllQueryOptions()),
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
