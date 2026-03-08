/**
 * Spotify API response types.
 * Used when creating playlists via POST /me/playlists.
 */
export type SpotifyCreatePlaylistResponse = {
	id: string;
	external_urls: { spotify: string };
};
