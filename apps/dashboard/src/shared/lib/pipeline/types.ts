export type PipelineProgressStage = {
	processed?: number;
	total?: number;
	found?: number;
	classified?: number;
	embedded?: number;
	clusters?: number;
	playlists?: number;
	tracksOrganized?: number;
};

export type PipelineStreamState = {
	status: string | null;
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
