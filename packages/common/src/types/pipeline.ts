import type { CreatedPlaylist } from "../schemas";

// Stage-specific progress types for the Organize pipeline; PipelineProgress aggregates them.

export type SyncPhase = "liked" | "playlists" | "preparing";

export type SyncProgress = {
	total: number;
	done: boolean;
	phase?: SyncPhase;
	phasesCompleted?: number; // 0-3
	percent?: number; // 0-100
};

export type LyricsProgress = {
	found: number;
	notFound: number;
	processed: number;
	total: number;
};

export type AudioFeaturesProgress = {
	found: number;
	notFound: number;
	processed: number;
	total: number;
};

export type ClassifyProgress = {
	classified: number;
	total: number;
	pending: number;
};

export type EmbedProgress = {
	embedded: number;
	total: number;
	pending: number;
};

export type ClusterProgress = {
	clusters: number;
	noise: number;
	totalTracks: number;
};

export type GenerateProgress = {
	playlists: number;
	tracksOrganized: number;
	/** Existing playlist IDs updated in place this run (see #158) — export candidates. Excludes newly created playlists. */
	updatedPlaylistIds?: number[];
	/** Brand new playlists created this run (see #168's weekly digest). */
	createdPlaylists?: CreatedPlaylist[];
};

export type PipelineProgress = {
	sync?: SyncProgress;
	lyrics?: LyricsProgress;
	audioFeatures?: AudioFeaturesProgress;
	classify?: ClassifyProgress;
	embed?: EmbedProgress;
	cluster?: ClusterProgress;
	generate?: GenerateProgress;
	export?: Record<string, unknown>;
};
