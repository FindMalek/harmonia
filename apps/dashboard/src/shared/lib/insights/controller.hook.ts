"use client";

import { useQuery } from "@tanstack/react-query";
import { insightsSummaryQueryOptions } from "./insights.util";

export { insightsSummaryQueryOptions } from "./insights.util";

export function useInsightsController() {
	const summary = useQuery(insightsSummaryQueryOptions());
	return { summary };
}
