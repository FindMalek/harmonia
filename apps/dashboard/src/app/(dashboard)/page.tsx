import {
	dehydrate,
	HydrationBoundary,
	QueryClient,
	QueryClientProvider,
} from "@tanstack/react-query";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { LibraryOverviewSkeleton } from "@/components/dashboard/library-overview";
import { LibraryStatsWrapper } from "@/components/dashboard/library-stats-wrapper";
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
				<Suspense fallback={<LibraryOverviewSkeleton />}>
					<LibraryStatsWrapper userId={session.user.id} />
				</Suspense>
			</DashboardShell>
		</HydrationBoundary>
	);
}
