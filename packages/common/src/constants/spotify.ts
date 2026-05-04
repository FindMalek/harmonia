export const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

export const SPOTIFY_RATE_LIMIT_MAX_RETRIES = 3;
export const SPOTIFY_RATE_LIMIT_MAX_WAIT_SEC = 60;

export const SPOTIFY_PLAYLIST_ITEMS_LIMIT = 50;
export const SPOTIFY_PLAYLIST_ITEMS_FIELDS =
	"items(track(id,name,uri,album(id,name),artists(id,name),duration_ms))";

export const PLAYLIST_FETCH_CONCURRENCY = 3;
export const PLAYLIST_FETCH_DELAY_MS = 150;
export const TRACK_UPSERT_BATCH_SIZE = 100;
export const LIKED_PHASE_PERCENT_CAP_BEFORE_MILESTONE = 24;

/** Library stats cache TTL. Will be plan-based later (e.g. free=24h, paid=shorter). */
export const LIBRARY_STATS_CACHE_STALE_MS = 24 * 60 * 60 * 1000;

/** When true (paid plans), include followed/collaborative playlists. For now: owned only. */
export const INCLUDE_FOLLOWED_PLAYLISTS = false;

export const STATS_FETCH_CONCURRENCY = 4;

export const SPOTIFY_EXPORT_MAX_TRACKS_PER_REQUEST = 100;
