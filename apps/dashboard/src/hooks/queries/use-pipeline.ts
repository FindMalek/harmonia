import { orpc } from "@/lib/orpc";
import { useQuery } from "@tanstack/react-query";

export function usePipelineRuns() {
	return useQuery({
		...orpc.pipeline.getAll.queryOptions({ input: {} }),
		refetchInterval: (query) =>
			query.state.data?.some((r: { status: string }) => r.status === "running")
				? 2000
				: false,
		refetchIntervalInBackground: false,
	});
}

export function usePipelineStats(refetchInterval: number | false) {
	return useQuery({
		...orpc.pipeline.stats.queryOptions({ input: {} }),
		refetchInterval,
		refetchIntervalInBackground: false,
	});
}
