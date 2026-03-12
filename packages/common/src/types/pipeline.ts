/**
 * Stage-specific progress types for the Organize pipeline.
 * Each stage reports its own shape; PipelineProgress aggregates them.
 */

export type SyncProgress = {
	total: number;
	done: boolean;
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
