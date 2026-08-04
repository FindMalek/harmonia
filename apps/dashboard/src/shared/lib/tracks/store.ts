import type { TracksListSort } from "@harmonia/common/schemas";
import { create } from "zustand";

interface TracksStore {
	search: string;
	setSearch: (value: string) => void;
	sort: TracksListSort;
	setSort: (value: TracksListSort) => void;
}

export const useTracksStore = create<TracksStore>((set) => ({
	search: "",
	setSearch: (value) => set({ search: value }),
	sort: "recent",
	setSort: (value) => set({ sort: value }),
}));
