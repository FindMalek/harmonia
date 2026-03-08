"use client";

import { Progress, Skeleton } from "@harmonia/ui";
import {
	usePipelineRuns,
	usePipelineStats,
} from "@/hooks/queries/use-pipeline";
import { client } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

type LiveProgress = {
	tracksTotal: number;
	lyricsCollected: number;
	tracksAnalyzed: number;
	embedded: number;
};

function useLivePipelineProgress(
	activeRunId: number | null,
): LiveProgress | null {
	const [liveProgress, setLiveProgress] = useState<LiveProgress | null>(null);
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

export function LibraryAnalysis() {
	const { data: runs } = usePipelineRuns();
	const activeRun = runs?.find((r) => r.status === "running") ?? null;
	const liveProgress = useLivePipelineProgress(activeRun?.id ?? null);

	const { data: stats, isLoading: statsLoading } = usePipelineStats(
		activeRun ? 3000 : false,
	);

	const totalTracks = stats?.tracks.total ?? 0;
	const lyricsCollected = liveProgress
		? liveProgress.lyricsCollected
		: (stats?.tracks.withLyrics ?? 0);
	const tracksAnalyzed = liveProgress
		? liveProgress.tracksAnalyzed
		: (stats?.tracks.classified ?? 0);
	const embedded = liveProgress
		? liveProgress.embedded
		: (stats?.tracks.embedded ?? 0);

	const lyricsPercentage =
		totalTracks > 0 ? (lyricsCollected / totalTracks) * 100 : 0;
	const analyzedPercentage =
		totalTracks > 0 ? (tracksAnalyzed / totalTracks) * 100 : 0;
	const embedPercentage = totalTracks > 0 ? (embedded / totalTracks) * 100 : 0;

	return (
		<div className="space-y-4">
			<h3 className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
				Library Analysis
			</h3>

			<div className="space-y-6">
				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<span className="text-sm">Tracks analyzed</span>
						<span className="font-mono text-muted-foreground text-sm">
							{tracksAnalyzed.toLocaleString()} / {totalTracks.toLocaleString()}
						</span>
					</div>
					{statsLoading && !liveProgress ? (
						<Skeleton className="h-1 w-full" />
					) : (
						<Progress value={analyzedPercentage} className="h-1" />
					)}
				</div>

				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<span className="text-sm">Lyrics collected</span>
						<span className="font-mono text-muted-foreground text-sm">
							{lyricsCollected.toLocaleString()}
						</span>
					</div>
					{statsLoading && !liveProgress ? (
						<Skeleton className="h-1 w-full" />
					) : (
						<Progress value={lyricsPercentage} className="h-1" />
					)}
				</div>

				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<span className="text-sm">AI classification progress</span>
						<span className="font-mono text-muted-foreground text-sm">
							{embedded.toLocaleString()} / {totalTracks.toLocaleString()}
						</span>
					</div>
					{statsLoading && !liveProgress ? (
						<Skeleton className="h-1 w-full" />
					) : (
						<Progress value={embedPercentage} className="h-1" />
					)}
				</div>
			</div>
		</div>
	);
}
