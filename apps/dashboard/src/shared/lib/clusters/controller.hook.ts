"use client";

import { orpc } from "@/shared/api/orpc";
import { useQuery } from "@tanstack/react-query";
import { useClustersStore } from "./store";

export function useClustersController() {
	const store = useClustersStore();

	const list = useQuery(orpc.clusters.list.queryOptions({ input: {} }));

	const detail = useQuery({
		...orpc.clusters.getById.queryOptions({
			input: { id: store.selectedClusterId ?? 0 },
		}),
		enabled: store.selectedClusterId !== null,
	});

	return { ...store, list, detail };
}
