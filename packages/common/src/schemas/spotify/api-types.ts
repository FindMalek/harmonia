// Spotify API response types

export type SpotifyTokenResponse = {
	access_token: string;
	expires_in: number;
	scope?: string;
	token_type: string;
};

export type SpotifyPlaylistSimplified = {
	id: string;
	name: string;
	snapshot_id?: string | null;
	tracks: { href: string; total: number };
	owner?: { id: string } | null;
};

export type SpotifyPlaylistsResponse = {
	items: SpotifyPlaylistSimplified[];
	next: string | null;
	total: number;
};

export type SpotifyPlaylistTrackItem = {
	track: {
		id: string | null;
		name: string;
		uri?: string;
		duration_ms?: number | null;
		artists: Array<{ id?: string | null; name: string }>;
		album: { id?: string | null; name: string; release_date?: string } | null;
		explicit?: boolean;
		popularity?: number;
	} | null;
};

export type SpotifyPlaylistTracksResponse = {
	items: SpotifyPlaylistTrackItem[];
	next: string | null;
};

export type SpotifyCreatePlaylistResponse = {
	id: string;
	external_urls: { spotify: string };
};

export type SpotifyArtistSimplified = {
	id: string;
	name: string;
	images?: Array<{ url: string }>;
} | null; // Spotify returns null in the array for an ID it couldn't resolve

export type SpotifyArtistsResponse = {
	artists: SpotifyArtistSimplified[];
};
