import { orpc } from "@/lib/orpc";
import { useQuery } from "@tanstack/react-query";

export function useClusters() {
	return useQuery(orpc.clusters.list.queryOptions({ input: {} }));
}

export function useClusterDetail(id: number | null) {
	return useQuery({
		...orpc.clusters.getById.queryOptions({ input: { id: id ?? 0 } }),
		enabled: id !== null,
	});
}
