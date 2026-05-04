import { orpc } from "@/shared/api/orpc";
import type {
	LivePipelineProgress,
	PipelineProgressStage,
	PipelineStreamState,
} from "./types";

export const PIPELINE_HYDRATION_STALE_MS = 60_000;

export function pipelineGetAllQueryOptions() {
	return {
		...orpc.pipeline.getAll.queryOptions({ input: {} }),
		staleTime: PIPELINE_HYDRATION_STALE_MS,
		refetchOnMount: false,
		refetchOnWindowFocus: false,
	};
}

export function pipelineStatsQueryOptions() {
	return {
		...orpc.pipeline.stats.queryOptions({ input: {} }),
		staleTime: PIPELINE_HYDRATION_STALE_MS,
		refetchOnMount: false,
		refetchOnWindowFocus: false,
	};
}

export const EMPTY_SNAPSHOT: PipelineStreamState = {
	status: null,
	currentStage: null,
	progress: {},
	startedAt: null,
	completedAt: null,
	error: null,
};

export function snapshotFromRun(run: {
	status: string;
	currentStage: string | null;
	progress: Record<string, unknown> | null;
	error: string | null;
	startedAt: Date | null;
	completedAt: Date | null;
}): PipelineStreamState {
	return {
		status: run.status,
		currentStage: run.currentStage,
		progress: (run.progress as Record<string, PipelineProgressStage>) ?? {},
		startedAt: run.startedAt ?? null,
		completedAt: run.completedAt ?? null,
		error: run.error ?? null,
	};
}

export function deriveLiveProgress(
	progress: Record<string, PipelineProgressStage>,
): LivePipelineProgress {
	const p = progress;
	const sync = p.sync;
	const lyrics = p.lyrics;
	const classify = p.classify;
	const embed = p.embed;

	const total =
		typeof sync?.total === "number"
			? sync.total
			: typeof lyrics?.total === "number"
				? lyrics.total
				: typeof classify?.total === "number"
					? classify.total
					: 0;

	return {
		tracksTotal: total,
		lyricsCollected: Number(lyrics?.processed ?? 0),
		tracksAnalyzed: Number(classify?.classified ?? 0),
		embedded: Number(embed?.embedded ?? 0),
	};
}
