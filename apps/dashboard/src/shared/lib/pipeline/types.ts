export type PipelineRunStatus =
	| "pending"
	| "running"
	| "completed"
	| "partial"
	| "failed"
	| "cancelled";

export type PipelineProgressStage = {
	processed?: number;
	total?: number;
	found?: number;
	classified?: number;
	embedded?: number;
	clusters?: number;
	/** Cluster stage only — the pool of embedded tracks DBSCAN ran against, distinct from `total`. */
	totalTracks?: number;
	playlists?: number;
	tracksOrganized?: number;
};

export type PipelineStreamState = {
	status: PipelineRunStatus | null;
	currentStage: string | null;
	progress: Record<string, PipelineProgressStage>;
	startedAt: Date | null;
	completedAt: Date | null;
	error: string | null;
};

export type LivePipelineProgress = {
	tracksTotal: number;
	lyricsCollected: number;
	tracksAnalyzed: number;
	embedded: number;
};

export type PipelineConnectionState =
	| "idle"
	| "hydrating"
	| "streaming"
	| "reconnecting";

export type PipelineProgressContextValue = {
	runId: number | null;
	snapshot: PipelineStreamState;
	connectionState: PipelineConnectionState;
	liveProgress: LivePipelineProgress | null;
};
