# Spotify Module

## Files

- **client.ts** — HTTP client: `spotifyRequest`, `getUserSpotifyAccessToken`, fetch helpers. Handles 429 retries and auth.
- **library-stats.ts** — Dashboard stats: fetches owned playlists + items (with snapshot cache), aggregates tracks/albums/artists, 24h cache.
- **library-sync.ts** — Full sync for Organize pipeline: saved tracks + playlist items (uses cache when snapshot matches), track upsert.
- **playlist-cache.ts** — Typed cache for playlist items: `getCachedPlaylistItems`, `setCachedPlaylistItems`. Shared by stats and sync.
- **export.ts** — Write-back: create/update Spotify playlists from Sonaraem playlists.

## Data Flow

- **Dashboard** → `getSpotifyLibraryStats` → `refreshSpotifyLibraryStats` → owned playlists + items (cache or fetch) → aggregate → `userSpotifyLibraryStats`
- **Organize** → `syncLibraryTracks` → saved tracks + playlist items (cache or fetch) → track upsert
- **Shared cache** — `user_playlist_snapshot_items` + `user_playlist_snapshot_item_artists` (typed tables). When snapshot matches, no API call.
