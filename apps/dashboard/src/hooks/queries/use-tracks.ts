import { orpc } from "@/lib/orpc";
import { useQuery } from "@tanstack/react-query";

import type { TracksFilters } from "@/stores/dashboard-ui";

export function useTracks(filters: TracksFilters) {
	return useQuery(
		orpc.tracks.list.queryOptions({
			input: {
				page: filters.page,
				pageSize: 30,
				search: filters.search || undefined,
			},
		}),
	);
}

export function useTrackDetail(id: string | null) {
	return useQuery({
		...orpc.tracks.getById.queryOptions({ input: { id: id ?? "" } }),
		enabled: !!id,
	});
}
