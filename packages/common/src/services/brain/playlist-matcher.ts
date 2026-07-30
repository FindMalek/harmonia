export type ClusterCandidate = {
	clusterIndex: number;
	trackIds: Set<string>;
};

export type ExistingPlaylist = {
	playlistId: number;
	trackIds: Set<string>;
};

export type PlaylistMatch = {
	clusterIndex: number;
	playlistId: number;
	similarity: number;
};

/**
 * Jaccard similarity (|intersection| / |union|) between two track-ID sets.
 * Chosen over the overlap coefficient (|intersection| / min(|A|,|B|)) because
 * the coefficient is fooled by size asymmetry: a small cluster that happens to
 * share most of its (few) tracks with one slice of a much larger playlist
 * scores misleadingly high, even when that playlist is mostly unrelated
 * content. Jaccard penalizes that by weighting the union, not just the
 * smaller set.
 */
export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
	if (a.size === 0 && b.size === 0) return 1;
	const [smaller, larger] = a.size <= b.size ? [a, b] : [b, a];
	let intersection = 0;
	for (const id of smaller) {
		if (larger.has(id)) intersection++;
	}
	const union = a.size + b.size - intersection;
	return union === 0 ? 0 : intersection / union;
}

/**
 * Matches new clusters to existing playlists by track-overlap similarity,
 * so a re-cluster updates the same playlist instead of creating a duplicate.
 * Clustering is non-deterministic run-to-run (DBSCAN + k-means fallback), so
 * cluster IDs can't be trusted to persist — this compares actual membership.
 *
 * Each cluster and each playlist is matched at most once (greedy, by
 * descending similarity). A cluster with no match at or above `threshold`
 * gets no entry in the result (caller creates a new playlist for it). An
 * existing playlist with no match gets no entry either (caller leaves it
 * untouched — see #158: deleting a playlist the user still has on Spotify
 * just because this run's clustering moved past it is a worse failure mode
 * than a temporarily stale one).
 */
export function matchClustersToPlaylists(
	clusters: readonly ClusterCandidate[],
	playlists: readonly ExistingPlaylist[],
	threshold: number,
): PlaylistMatch[] {
	const candidates: Array<PlaylistMatch & { intersectionSize: number }> = [];

	for (const c of clusters) {
		for (const p of playlists) {
			const similarity = jaccardSimilarity(c.trackIds, p.trackIds);
			if (similarity < threshold) continue;
			let intersectionSize = 0;
			const [smaller, larger] =
				c.trackIds.size <= p.trackIds.size
					? [c.trackIds, p.trackIds]
					: [p.trackIds, c.trackIds];
			for (const id of smaller) {
				if (larger.has(id)) intersectionSize++;
			}
			candidates.push({
				clusterIndex: c.clusterIndex,
				playlistId: p.playlistId,
				similarity,
				intersectionSize,
			});
		}
	}

	// Deterministic tie-break so re-running identical input gives identical
	// output: highest similarity first; ties broken by larger absolute overlap
	// (more shared tracks = more meaningful continuity, e.g. when a cluster
	// cleanly bisects and both halves score similarity 0.5 against the
	// original); remaining ties broken by playlist ID then cluster index.
	candidates.sort((a, b) => {
		if (b.similarity !== a.similarity) return b.similarity - a.similarity;
		if (b.intersectionSize !== a.intersectionSize)
			return b.intersectionSize - a.intersectionSize;
		if (a.playlistId !== b.playlistId) return a.playlistId - b.playlistId;
		return a.clusterIndex - b.clusterIndex;
	});

	const usedClusters = new Set<number>();
	const usedPlaylists = new Set<number>();
	const result: PlaylistMatch[] = [];

	for (const cand of candidates) {
		if (
			usedClusters.has(cand.clusterIndex) ||
			usedPlaylists.has(cand.playlistId)
		) {
			continue;
		}
		usedClusters.add(cand.clusterIndex);
		usedPlaylists.add(cand.playlistId);
		result.push({
			clusterIndex: cand.clusterIndex,
			playlistId: cand.playlistId,
			similarity: cand.similarity,
		});
	}

	return result;
}
