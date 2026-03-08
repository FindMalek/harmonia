# Spotify Module

## Files

- **client.ts** — HTTP client: `spotifyRequest`, `getUserSpotifyAccessToken`, fetch helpers. Handles 429 retries and auth.
- **library-stats.ts** — Lightweight stats for dashboard: fetches `/me/playlists` only. No track fetching.
- **library-sync.ts** — Full sync for Organize pipeline: saved tracks + playlist items, track upsert, snapshot cache.
- **export.ts** — Write-back: create/update Spotify playlists from Harmonia playlists.

## Data Flow

- **Dashboard** → `getSpotifyLibraryStats` → `refreshSpotifyLibraryStats` → `fetchAllUserPlaylists` (playlists only)
- **Organize** → `syncLibraryTracks` → saved tracks + playlist items → track upsert
