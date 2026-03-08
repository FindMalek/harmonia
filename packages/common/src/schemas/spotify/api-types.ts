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
		artists: Array<{ name: string }>;
		album: { name: string } | null;
	} | null;
};

export type SpotifyPlaylistTracksResponse = {
	items: SpotifyPlaylistTrackItem[];
	next: string | null;
};
