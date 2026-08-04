"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useDeferredValue } from "react";
import { orpc } from "@/shared/api/orpc";
import { useTracksStore } from "./store";

const TRACKS_PAGE_SIZE = 50;

export function useTracksController() {
	const store = useTracksStore();
	const deferredSearch = useDeferredValue(store.search.trim());

	const list = useInfiniteQuery({
		...orpc.tracks.list.infiniteOptions({
			input: (page: number) => ({
				page,
				pageSize: TRACKS_PAGE_SIZE,
				search: deferredSearch || undefined,
				sort: store.sort,
			}),
			initialPageParam: 1,
			getNextPageParam: (lastPage) =>
				lastPage.page * lastPage.pageSize < lastPage.total
					? lastPage.page + 1
					: undefined,
		}),
	});

	return {
		list,
		search: store.search,
		setSearch: store.setSearch,
		sort: store.sort,
		setSort: store.setSort,
	};
}
