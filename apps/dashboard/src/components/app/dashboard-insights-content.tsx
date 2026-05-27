"use client";

import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { useInsightsController } from "@/shared/lib/insights/controller.hook";
import {
	DashboardInsightsEmotionalLandscape,
	DashboardInsightsEmotionalLandscapeSkeleton,
} from "./dashboard-insights-emotional-landscape";
import {
	DashboardInsightsGenreBreakdown,
	DashboardInsightsGenreBreakdownSkeleton,
} from "./dashboard-insights-genre-breakdown";
import {
	DashboardInsightsListening,
	DashboardInsightsListeningSkeleton,
} from "./dashboard-insights-listening";
import {
	DashboardInsightsMoodVibe,
	DashboardInsightsMoodVibeSkeleton,
} from "./dashboard-insights-mood-vibe";
import {
	DashboardInsightsPersonality,
	DashboardInsightsPersonalitySkeleton,
} from "./dashboard-insights-personality";
import {
	DashboardInsightsPlaylistCoverage,
	DashboardInsightsPlaylistCoverageSkeleton,
} from "./dashboard-insights-playlist-coverage";
import {
	DashboardInsightsProcessingStatus,
	DashboardInsightsProcessingStatusSkeleton,
} from "./dashboard-insights-processing-status";
import {
	DashboardInsightsSonicDna,
	DashboardInsightsSonicDnaSkeleton,
} from "./dashboard-insights-sonic-dna";
import {
	DashboardInsightsStatsGrid,
	DashboardInsightsStatsGridSkeleton,
} from "./dashboard-insights-stats-grid";

function InsightsSkeleton() {
	return (
		<div className="space-y-6">
			<PageHeader
				title="Insights"
				description="Sonic DNA, moods, and playlist coverage"
			/>
			<DashboardInsightsStatsGridSkeleton />
			<DashboardInsightsPersonalitySkeleton />
			<DashboardInsightsListeningSkeleton />
			<DashboardInsightsSonicDnaSkeleton />
			<DashboardInsightsMoodVibeSkeleton />
			<DashboardInsightsGenreBreakdownSkeleton />
			<DashboardInsightsEmotionalLandscapeSkeleton />
			<DashboardInsightsPlaylistCoverageSkeleton />
			<DashboardInsightsProcessingStatusSkeleton />
		</div>
	);
}

export function DashboardInsightsContent() {
	const { summary } = useInsightsController();

	if (summary.isLoading) return <InsightsSkeleton />;

	if (summary.isError) {
		return (
			<ErrorState
				message={
					summary.error instanceof Error
						? summary.error.message
						: "Failed to load insights"
				}
				onRetry={() => summary.refetch()}
			/>
		);
	}

	const data = summary.data;
	if (!data) return <InsightsSkeleton />;

	return (
		<div className="space-y-6">
			<PageHeader
				title="Insights"
				description="Sonic DNA, moods, and playlist coverage"
			/>

			<DashboardInsightsStatsGrid
				totalTracks={data.library.totalTracks}
				uniqueArtists={data.library.uniqueArtists}
				genreDomains={data.library.genreDomains}
				generatedPlaylists={data.library.generatedPlaylists}
			/>

			{data.personality && (
				<DashboardInsightsPersonality
					primaryMood={data.personality.primaryMood}
					secondaryMood={data.personality.secondaryMood}
					favoriteEra={data.personality.favoriteEra}
					eraDistribution={data.personality.eraDistribution}
				/>
			)}

			{data.listening && (
				<DashboardInsightsListening
					topGenre={data.listening.topGenre}
					topThemes={data.listening.topThemes}
					avgEnergy={data.listening.avgEnergy}
				/>
			)}

			{data.sonicDna && <DashboardInsightsSonicDna dna={data.sonicDna} />}

			{(data.moodDistribution.length > 0 || data.topVibes.length > 0) && (
				<DashboardInsightsMoodVibe
					moodDistribution={data.moodDistribution}
					topVibes={data.topVibes}
				/>
			)}

			{data.genreBreakdown.length > 0 && (
				<DashboardInsightsGenreBreakdown genreBreakdown={data.genreBreakdown} />
			)}

			{data.emotionalLandscape && (
				<DashboardInsightsEmotionalLandscape
					landscape={data.emotionalLandscape}
				/>
			)}

			{data.playlistCoverage && (
				<DashboardInsightsPlaylistCoverage coverage={data.playlistCoverage} />
			)}

			<DashboardInsightsProcessingStatus status={data.processingStatus} />
		</div>
	);
}
