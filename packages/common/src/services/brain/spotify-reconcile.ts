/**
 * Diffs Harmonia's last-known track set for a playlist against what's
 * actually on Spotify right now, so a manual edit the user made directly on
 * Spotify (added or removed a track) survives the next pipeline run instead
 * of being silently overwritten by clustering output (#159).
 */
export function diffManualSpotifyEdits(
	harmoniaTrackIds: ReadonlySet<string>,
	liveSpotifyTrackIds: ReadonlySet<string>,
): { added: string[]; removed: string[] } {
	const added: string[] = [];
	for (const id of liveSpotifyTrackIds) {
		if (!harmoniaTrackIds.has(id)) added.push(id);
	}

	const removed: string[] = [];
	for (const id of harmoniaTrackIds) {
		if (!liveSpotifyTrackIds.has(id)) removed.push(id);
	}

	return { added, removed };
}
