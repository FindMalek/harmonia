"use client";

import { useOrganizeStore } from "@/shared/lib/organize/store";
import {
	usePipelineController,
	usePipelineProgress,
} from "@/shared/lib/pipeline/controller.hook";
import { Progress, Skeleton } from "@harmonia/ui";

function DashboardLibraryAnalysisProgressSkeleton() {
	return <Skeleton className="h-1 w-full" />;
}

export function DashboardLibraryAnalysis() {
	const { runs } = usePipelineController();
	const activeRunId = useOrganizeStore((s) => s.activeRunId);
	const { liveProgress: ctxLiveProgress } = usePipelineProgress();
	const activeRun =
		activeRunId != null
			? (runs.data?.find((r) => r.id === activeRunId) ?? null)
			: null;
	const isStreamingRun = activeRun?.status === "running";
	const liveProgress = isStreamingRun ? ctxLiveProgress : null;
	const { stats } = usePipelineController(isStreamingRun ? 3000 : false);
	const statsLoading = stats.isLoading;

	const totalTracks = stats.data?.tracks.total ?? 0;
	const lyricsCollected = liveProgress
		? liveProgress.lyricsCollected
		: (stats.data?.tracks.withLyrics ?? 0);
	const tracksAnalyzed = liveProgress
		? liveProgress.tracksAnalyzed
		: (stats.data?.tracks.classified ?? 0);
	const embedded = liveProgress
		? liveProgress.embedded
		: (stats.data?.tracks.embedded ?? 0);

	const lyricsPercentage =
		totalTracks > 0 ? (lyricsCollected / totalTracks) * 100 : 0;
	const analyzedPercentage =
		totalTracks > 0 ? (tracksAnalyzed / totalTracks) * 100 : 0;
	const embedPercentage = totalTracks > 0 ? (embedded / totalTracks) * 100 : 0;

	return (
		<div className="space-y-4 ">
			<h3 className="pb-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">
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
						<DashboardLibraryAnalysisProgressSkeleton />
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
						<DashboardLibraryAnalysisProgressSkeleton />
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
						<DashboardLibraryAnalysisProgressSkeleton />
					) : (
						<Progress value={embedPercentage} className="h-1" />
					)}
				</div>
			</div>
		</div>
	);
}
