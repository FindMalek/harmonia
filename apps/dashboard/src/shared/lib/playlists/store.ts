import type { PlaylistSort, PlaylistTrackSort } from "@sonaraem/common/schemas";
import { create } from "zustand";

interface PlaylistsStore {
	selectedPlaylistId: number | null;
	setSelectedPlaylist: (id: number | null) => void;
	/** Search within the currently-viewed playlist's own tracklist (playlist/[id]), not the playlists list. */
	trackSearch: string;
	setTrackSearch: (value: string) => void;
	/** Sort for the /playlists list. */
	sort: PlaylistSort;
	setSort: (value: PlaylistSort) => void;
	/** Sort for the currently-viewed playlist's own tracklist. */
	trackSort: PlaylistTrackSort;
	setTrackSort: (value: PlaylistTrackSort) => void;
}

export const usePlaylistsStore = create<PlaylistsStore>((set) => ({
	selectedPlaylistId: null,
	setSelectedPlaylist: (id) => set({ selectedPlaylistId: id }),
	trackSearch: "",
	setTrackSearch: (value) => set({ trackSearch: value }),
	sort: "recent",
	setSort: (value) => set({ sort: value }),
	trackSort: "default",
	setTrackSort: (value) => set({ trackSort: value }),
}));
