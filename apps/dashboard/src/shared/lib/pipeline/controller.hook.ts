"use client";

import { client } from "@/shared/api/orpc";
import { queryKeys } from "@/shared/api/query-keys";
import { useOrganizeStore } from "@/shared/lib/organize/store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
	EMPTY_SNAPSHOT,
	deriveLiveProgress,
	pipelineGetAllQueryOptions,
	pipelineStatsQueryOptions,
	snapshotFromRun,
} from "./pipeline.util";
import type {
	LivePipelineProgress,
	PipelineConnectionState,
	PipelineProgressContextValue,
	PipelineProgressStage,
	PipelineStreamState,
} from "./types";

export const PipelineProgressContext =
	createContext<PipelineProgressContextValue | null>(null);

export function usePipelineProgress(): PipelineProgressContextValue {
	const ctx = useContext(PipelineProgressContext);
	if (!ctx) {
		throw new Error(
			"usePipelineProgress must be used within DashboardLayoutShell",
		);
	}
	return ctx;
}

export function usePipelineController(refetchInterval: number | false = false) {
	const runs = useQuery({
		...pipelineGetAllQueryOptions(),
		refetchInterval: (query) =>
			query.state.data?.some((r: { status: string }) => r.status === "running")
				? 2000
				: false,
		refetchIntervalInBackground: false,
	});

	const stats = useQuery({
		...pipelineStatsQueryOptions(),
		refetchInterval,
		refetchIntervalInBackground: false,
	});

	return { runs, stats };
}

function sleep(ms: number) {
	return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function usePipelineProgressDrive(): PipelineProgressContextValue {
	const activeRunId = useOrganizeStore((s) => s.activeRunId);
	const queryClient = useQueryClient();
	const [snapshot, setSnapshot] = useState<PipelineStreamState>(EMPTY_SNAPSHOT);
	const [connectionState, setConnectionState] =
		useState<PipelineConnectionState>("idle");
	const [liveProgress, setLiveProgress] = useState<LivePipelineProgress | null>(
		null,
	);

	useEffect(() => {
		if (activeRunId === null) {
			setSnapshot(EMPTY_SNAPSHOT);
			setLiveProgress(null);
			setConnectionState("idle");
			return;
		}

		let cancelled = false;
		const ac = new AbortController();
		const subscribedRunId = activeRunId;

		setSnapshot(EMPTY_SNAPSHOT);
		setLiveProgress(null);
		setConnectionState("hydrating");

		function invalidatePipeline() {
			void queryClient.invalidateQueries({ queryKey: queryKeys.pipeline() });
		}

		async function drive() {
			let backoffMs = 500;

			setConnectionState("hydrating");
			const row = await client.pipeline.getById({ id: subscribedRunId });
			if (cancelled) return;

			if (!row) {
				setSnapshot({
					...EMPTY_SNAPSHOT,
					status: "failed",
					error: "Pipeline run not found",
				});
				setLiveProgress(null);
				setConnectionState("idle");
				invalidatePipeline();
				return;
			}

			const merged = snapshotFromRun(row);
			setSnapshot(merged);
			setLiveProgress(deriveLiveProgress(merged.progress));

			if (row.status !== "running") {
				setConnectionState("idle");
				invalidatePipeline();
				return;
			}

			while (!cancelled) {
				setConnectionState("streaming");
				try {
					const stream = await client.pipeline.streamStatus(
						{ id: subscribedRunId },
						{ signal: ac.signal },
					);

					for await (const data of stream) {
						if (cancelled) return;

						if (data.event === "progress") {
							backoffMs = 500;
							setSnapshot((s) => ({
								...s,
								status: data.status,
								currentStage: data.currentStage,
								progress: data.progress as Record<
									string,
									PipelineProgressStage
								>,
								startedAt: data.startedAt,
							}));
							setLiveProgress(
								deriveLiveProgress(
									data.progress as Record<string, PipelineProgressStage>,
								),
							);
						} else if (data.event === "completed") {
							setSnapshot((s) => ({
								...s,
								status: "completed",
								currentStage: null,
								progress: data.progress as Record<
									string,
									PipelineProgressStage
								>,
								completedAt: data.completedAt,
							}));
							setLiveProgress(
								deriveLiveProgress(
									data.progress as Record<string, PipelineProgressStage>,
								),
							);
							setConnectionState("idle");
							invalidatePipeline();
							return;
						} else if (data.event === "failed") {
							setSnapshot((s) => ({
								...s,
								status: "failed",
								currentStage: null,
								progress: data.progress as Record<
									string,
									PipelineProgressStage
								>,
								completedAt: data.completedAt,
								error: data.error ?? "Unknown error",
							}));
							setLiveProgress(
								deriveLiveProgress(
									data.progress as Record<string, PipelineProgressStage>,
								),
							);
							setConnectionState("idle");
							invalidatePipeline();
							return;
						} else if (data.event === "error") {
							setSnapshot((s) => ({
								...s,
								status: "failed",
								error: data.message ?? "Stream error",
							}));
							setConnectionState("idle");
							invalidatePipeline();
							return;
						}
					}

					if (cancelled || ac.signal.aborted) return;

					setConnectionState("reconnecting");
					const latest = await client.pipeline.getById({
						id: subscribedRunId,
					});
					if (cancelled) return;

					if (!latest || latest.status !== "running") {
						if (latest) {
							const snap = snapshotFromRun(latest);
							setSnapshot(snap);
							setLiveProgress(deriveLiveProgress(snap.progress));
						}
						setConnectionState("idle");
						invalidatePipeline();
						return;
					}

					const recovered = snapshotFromRun(latest);
					setSnapshot(recovered);
					setLiveProgress(deriveLiveProgress(recovered.progress));

					await sleep(backoffMs);
					if (cancelled) return;
					backoffMs = Math.min(backoffMs * 2, 15_000);
				} catch (err) {
					if (cancelled || ac.signal.aborted) return;

					console.error("Pipeline stream connection failed", err);

					setConnectionState("reconnecting");
					const latest = await client.pipeline.getById({
						id: subscribedRunId,
					});
					if (cancelled) return;

					if (!latest || latest.status !== "running") {
						if (latest) {
							const snap = snapshotFromRun(latest);
							setSnapshot(snap);
							setLiveProgress(deriveLiveProgress(snap.progress));
						}
						setConnectionState("idle");
						invalidatePipeline();
						return;
					}

					const recovered = snapshotFromRun(latest);
					setSnapshot(recovered);
					setLiveProgress(deriveLiveProgress(recovered.progress));

					await sleep(backoffMs);
					if (cancelled) return;
					backoffMs = Math.min(backoffMs * 2, 15_000);
				}
			}
		}

		void drive();

		return () => {
			cancelled = true;
			ac.abort();
		};
	}, [activeRunId, queryClient]);

	return useMemo<PipelineProgressContextValue>(
		() => ({
			runId: activeRunId,
			snapshot,
			connectionState,
			liveProgress,
		}),
		[activeRunId, snapshot, connectionState, liveProgress],
	);
}
