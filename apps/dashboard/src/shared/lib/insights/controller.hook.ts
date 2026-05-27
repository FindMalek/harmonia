"use client";

import { useQuery } from "@tanstack/react-query";
import { insightsSummaryQueryOptions } from "@/shared/lib/insights/insights.util";

export { insightsSummaryQueryOptions } from "@/shared/lib/insights/insights.util";

export function useInsightsController() {
	const summary = useQuery(insightsSummaryQueryOptions());
	return { summary };
}
