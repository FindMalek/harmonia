/**
 * Stage-specific progress types for the Organize pipeline.
 * Each stage reports its own shape; PipelineProgress aggregates them.
 */

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
	/** Playlist IDs created or updated in place this run (see #158) — export candidates. */
	updatedPlaylistIds?: number[];
};

export type PipelineProgress = {
	sync?: SyncProgress;
	lyrics?: LyricsProgress;
	classify?: ClassifyProgress;
	embed?: EmbedProgress;
	cluster?: ClusterProgress;
	generate?: GenerateProgress;
	export?: Record<string, unknown>;
};
