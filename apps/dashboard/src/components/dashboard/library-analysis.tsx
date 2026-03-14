"use client";

import { Progress, Skeleton } from "@harmonia/ui";
import {
	usePipelineRuns,
	usePipelineStats,
} from "@/hooks/queries/use-pipeline";
import { useLivePipelineProgress } from "@/hooks/use-live-pipeline-progress";

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
		<div className="space-y-4 ">
			<h3 className="text-muted-foreground text-xs font-medium uppercase tracking-wider pb-4">
				Library Analysis
			</h3>

			<div className="space-y-10">
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
