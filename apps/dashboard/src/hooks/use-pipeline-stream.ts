import { client } from "@/lib/orpc";
import { useEffect, useState } from "react";

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

export function usePipelineStream(runId: number | null) {
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

		// Initial fetch to get state immediately
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
					{
						signal: abortController.signal,
					},
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

		return () => {
			abortController.abort();
		};
	}, [runId]);

	return state;
}
