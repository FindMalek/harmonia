"use client";

import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/shared/api/orpc";
import { useTracksStore } from "./store";

export function useTracksController() {
	const store = useTracksStore();

	const list = useQuery(
		orpc.tracks.list.queryOptions({
			input: {
				page: store.tracksFilters.page,
				pageSize: 30,
				search: store.tracksFilters.search || undefined,
			},
		}),
	);

	const detail = useQuery({
		...orpc.tracks.getById.queryOptions({
			input: { id: store.selectedTrackId ?? "" },
		}),
		enabled: store.selectedTrackId !== null,
	});

	return { ...store, list, detail };
}
