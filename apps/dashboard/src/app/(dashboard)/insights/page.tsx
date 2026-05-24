import { DashboardInsightsContent } from "@/components/app/dashboard-insights-content";
import { getServerSession } from "@/shared/api/session.server";
import { insightsSummaryQueryOptions } from "@/shared/lib/insights/insights.util";
import {
	HydrationBoundary,
	QueryClient,
	dehydrate,
} from "@tanstack/react-query";
import { redirect } from "next/navigation";

export default async function InsightsPage() {
	const session = await getServerSession();
	if (!session?.user) redirect("/login");

	const queryClient = new QueryClient();
	await queryClient.prefetchQuery(insightsSummaryQueryOptions());

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<DashboardInsightsContent />
		</HydrationBoundary>
	);
}
