import { create } from "zustand";

interface PlaylistsStore {
	selectedPlaylistId: number | null;
	setSelectedPlaylist: (id: number | null) => void;
}

export const usePlaylistsStore = create<PlaylistsStore>((set) => ({
	selectedPlaylistId: null,
	setSelectedPlaylist: (id) => set({ selectedPlaylistId: id }),
}));
