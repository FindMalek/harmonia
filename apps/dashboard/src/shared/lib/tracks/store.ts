import { create } from "zustand";

export interface TracksFilters {
	page: number;
	search: string;
}

interface TracksStore {
	selectedTrackId: string | null;
	tracksFilters: TracksFilters;
	setSelectedTrack: (id: string | null) => void;
	setTracksFilters: (filters: Partial<TracksFilters>) => void;
}

export const useTracksStore = create<TracksStore>((set) => ({
	selectedTrackId: null,
	tracksFilters: { page: 1, search: "" },
	setSelectedTrack: (id) => set({ selectedTrackId: id }),
	setTracksFilters: (filters) =>
		set((s) => ({ tracksFilters: { ...s.tracksFilters, ...filters } })),
}));
