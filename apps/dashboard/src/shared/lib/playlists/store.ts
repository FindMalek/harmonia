import { create } from "zustand";

interface PlaylistsStore {
	selectedPlaylistId: number | null;
	setSelectedPlaylist: (id: number | null) => void;
	/** Search within the currently-viewed playlist's own tracklist (playlist/[id]), not the playlists list. */
	trackSearch: string;
	setTrackSearch: (value: string) => void;
}

export const usePlaylistsStore = create<PlaylistsStore>((set) => ({
	selectedPlaylistId: null,
	setSelectedPlaylist: (id) => set({ selectedPlaylistId: id }),
	trackSearch: "",
	setTrackSearch: (value) => set({ trackSearch: value }),
}));
