import { create } from "zustand";

export interface TracksFilters {
	page: number;
	search: string;
}

interface DashboardUIStore {
	selectedTrackId: string | null;
	selectedPlaylistId: number | null;
	selectedClusterId: number | null;
	tracksFilters: TracksFilters;
	expandedRunId: number | null;
	setSelectedTrack: (id: string | null) => void;
	setSelectedPlaylist: (id: number | null) => void;
	setSelectedCluster: (id: number | null) => void;
	setTracksFilters: (filters: Partial<TracksFilters>) => void;
	setExpandedRun: (id: number | null) => void;
}

export const useDashboardUI = create<DashboardUIStore>((set) => ({
	selectedTrackId: null,
	selectedPlaylistId: null,
	selectedClusterId: null,
	tracksFilters: { page: 1, search: "" },
	expandedRunId: null,
	setSelectedTrack: (id) => set({ selectedTrackId: id }),
	setSelectedPlaylist: (id) => set({ selectedPlaylistId: id }),
	setSelectedCluster: (id) => set({ selectedClusterId: id }),
	setTracksFilters: (filters) =>
		set((s) => ({ tracksFilters: { ...s.tracksFilters, ...filters } })),
	setExpandedRun: (id) => set({ expandedRunId: id }),
}));
