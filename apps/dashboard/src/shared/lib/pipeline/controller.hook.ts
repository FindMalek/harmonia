"use client";

import { client } from "@/shared/api/orpc";
import { queryKeys } from "@/shared/api/query-keys";
import { orpc } from "@/shared/api/orpc";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

export function usePipelineController(refetchInterval: number | false = false) {
	const runs = useQuery({
		...orpc.pipeline.getAll.queryOptions({ input: {} }),
		refetchInterval: (query) =>
			query.state.data?.some((r: { status: string }) => r.status === "running")
				? 2000
				: false,
		refetchIntervalInBackground: false,
	});

	const stats = useQuery({
		...orpc.pipeline.stats.queryOptions({ input: {} }),
		refetchInterval,
		refetchIntervalInBackground: false,
	});

	return { runs, stats };
}

// ─── Pipeline Stream ────────────────────────────────────────────────────────

export type PipelineProgressStage = {
	processed?: number;
	total?: number;
	found?: number;
	classified?: number;
	embedded?: number;
	clusters?: number;
	playlists?: number;
};

export type PipelineStreamState = {
	status: string | null;
	currentStage: string | null;
	progress: Record<string, PipelineProgressStage>;
	startedAt: Date | null;
	completedAt: Date | null;
	error: string | null;
};

export function usePipelineStream(runId: number | null): PipelineStreamState {
	const [state, setState] = useState<PipelineStreamState>({
		status: null,
		currentStage: null,
		progress: {},
		startedAt: null,
		completedAt: null,
		error: null,
	});

	useEffect(() => {
		if (!runId) return;

		client.pipeline.getById({ id: runId }).then((run) => {
			if (run) {
				setState((s) => ({
					...s,
					status: run.status,
					currentStage: run.currentStage,
					progress:
						(run.progress as Record<string, PipelineProgressStage>) ?? {},
					startedAt: run.startedAt ?? null,
					completedAt: run.completedAt ?? null,
					error: run.error ?? null,
				}));
			}
		});

		const abortController = new AbortController();

		async function connectStream() {
			if (!runId) return;
			try {
				const stream = await client.pipeline.streamStatus(
					{ id: runId },
					{ signal: abortController.signal },
				);
				for await (const data of stream) {
					if (abortController.signal.aborted) break;
					if (data.event === "progress") {
						setState((s) => ({
							...s,
							status: data.status,
							currentStage: data.currentStage,
							progress: data.progress as Record<string, PipelineProgressStage>,
							startedAt: data.startedAt,
						}));
					} else if (data.event === "completed") {
						setState((s) => ({
							...s,
							status: "completed",
							currentStage: null,
							progress: data.progress as Record<string, PipelineProgressStage>,
							completedAt: data.completedAt,
						}));
						break;
					} else if (data.event === "failed") {
						setState((s) => ({
							...s,
							status: "failed",
							currentStage: null,
							progress: data.progress as Record<string, PipelineProgressStage>,
							completedAt: data.completedAt,
							error: data.error ?? "Unknown error",
						}));
						break;
					} else if (data.event === "error") {
						setState((s) => ({
							...s,
							status: "failed",
							error: data.message ?? "Stream error",
						}));
						break;
					}
				}
			} catch (err) {
				if (!abortController.signal.aborted) {
					console.error("Stream connection failed", err);
				}
			}
		}

		connectStream();
		return () => abortController.abort();
	}, [runId]);

	return state;
}

// ─── Live Pipeline Progress ─────────────────────────────────────────────────

export type LivePipelineProgress = {
	tracksTotal: number;
	lyricsCollected: number;
	tracksAnalyzed: number;
	embedded: number;
};

export function useLivePipelineProgress(
	activeRunId: number | null,
): LivePipelineProgress | null {
	const [liveProgress, setLiveProgress] = useState<LivePipelineProgress | null>(
		null,
	);
	const queryClient = useQueryClient();
	const onCompleteRef = useRef(() => {
		queryClient.invalidateQueries({ queryKey: queryKeys.pipeline() });
	});
	onCompleteRef.current = () => {
		queryClient.invalidateQueries({ queryKey: queryKeys.pipeline() });
	};

	useEffect(() => {
		if (activeRunId === null) return;

		const controller = new AbortController();
		let cancelled = false;

		(async () => {
			try {
				const iterator = await client.pipeline.streamStatus(
					{ id: activeRunId },
					{ signal: controller.signal },
				);
				for await (const event of iterator) {
					if (cancelled) break;
					if (event.event === "progress" && event.progress) {
						const p = event.progress as Record<
							string,
							{
								processed?: number;
								total?: number;
								classified?: number;
								embedded?: number;
							}
						>;
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

						setLiveProgress({
							tracksTotal: total,
							lyricsCollected: Number(lyrics?.processed ?? 0),
							tracksAnalyzed: Number(classify?.classified ?? 0),
							embedded: Number(embed?.embedded ?? 0),
						});
					} else if (
						event.event === "completed" ||
						event.event === "failed" ||
						event.event === "error"
					) {
						onCompleteRef.current();
						break;
					}
				}
			} catch (err) {
				if (err instanceof Error && err.name !== "AbortError" && !cancelled) {
					onCompleteRef.current();
				}
			}
		})();

		return () => {
			cancelled = true;
			controller.abort();
		};
	}, [activeRunId, queryClient]);

	return liveProgress;
}
