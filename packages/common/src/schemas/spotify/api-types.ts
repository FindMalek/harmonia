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
		artists: Array<{ name: string }>;
		album: { name: string } | null;
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
