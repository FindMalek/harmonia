import { orpc } from "@/shared/api/orpc";
import { PIPELINE_HYDRATION_STALE_MS } from "@/shared/lib/constants";
import type {
	LivePipelineProgress,
	PipelineProgressStage,
	PipelineRunStatus,
	PipelineStreamState,
} from "./types";

export function pipelineGetAllQueryOptions() {
	return {
		...orpc.pipeline.getAll.queryOptions({ input: {} }),
		staleTime: PIPELINE_HYDRATION_STALE_MS,
		refetchOnMount: false,
		refetchOnWindowFocus: false,
		meta: { silent: true },
	};
}

export function pipelineStatsQueryOptions() {
	return {
		...orpc.pipeline.stats.queryOptions({ input: {} }),
		staleTime: PIPELINE_HYDRATION_STALE_MS,
		refetchOnMount: false,
		refetchOnWindowFocus: false,
		meta: { silent: true },
	};
}

export const EMPTY_SNAPSHOT: PipelineStreamState = {
	status: null,
	currentStage: null,
	progress: {},
	startedAt: null,
	completedAt: null,
	error: null,
	etaSeconds: null,
};

export function snapshotFromRun(run: {
	status: PipelineRunStatus;
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
		// Only the live stream computes this — a plain row fetch (initial
		// hydration probe) has nothing to estimate from yet.
		etaSeconds: null,
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
