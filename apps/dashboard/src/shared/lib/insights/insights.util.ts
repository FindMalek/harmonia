import { orpc } from "@/shared/api/orpc";

const INSIGHTS_STALE_MS = 5 * 60 * 1000;

export function insightsSummaryQueryOptions() {
	return {
		...orpc.insights.summary.queryOptions({ input: {} }),
		staleTime: INSIGHTS_STALE_MS,
		refetchOnMount: false,
		refetchOnWindowFocus: false,
	};
}
