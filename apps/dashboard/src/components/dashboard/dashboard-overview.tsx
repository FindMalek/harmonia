"use client";

import { useSpotifyLibraryStats } from "@/hooks/queries/use-spotify-library-stats";
import { AnalyzeMusicButton } from "./analyze-music-button";
import { LibraryAnalysis } from "./library-analysis";
import { LibraryOverview } from "./library-overview";

export function DashboardOverview() {
	const { data: libraryStats, isLoading: libraryStatsLoading } =
		useSpotifyLibraryStats();

	return (
		<div className="mx-auto max-w-3xl space-y-10 pb-20">
			<div className="space-y-2">
				<h1 className="font-semibold text-3xl">Welcome back</h1>
			</div>

			<AnalyzeMusicButton />

			<LibraryOverview
				stats={libraryStats ?? null}
				isLoading={libraryStatsLoading}
			/>

			<LibraryAnalysis />
		</div>
	);
}
