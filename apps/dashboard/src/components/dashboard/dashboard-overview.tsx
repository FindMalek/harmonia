"use client";

import { Button } from "@harmonia/ui";
import { DASHBOARD_ROUTES } from "@harmonia/common/utils/routes";
import { authClient } from "@/lib/auth-client";
import { env } from "@/lib/env";
import { useSpotifyLibraryStats } from "@/hooks/queries/use-spotify-library-stats";
import { useSpotifyLinked } from "@/hooks/queries/use-spotify-linked";
import { AnalyzeMusicButton } from "./analyze-music-button";
import { LibraryAnalysis } from "./library-analysis";
import { LibraryOverview } from "./library-overview";

export function DashboardOverview() {
	const { data: spotifyData } = useSpotifyLinked();
	const { data: libraryStats, isLoading: libraryStatsLoading } =
		useSpotifyLibraryStats();

	const showLinkSpotify = spotifyData?.hasSpotify === false;

	return (
		<div className="mx-auto max-w-3xl space-y-10 pb-20">
			{/* Header */}
			<div className="space-y-2">
				<h1 className="font-semibold text-3xl">Welcome back</h1>
				<p className="text-muted-foreground">
					{showLinkSpotify
						? "Please link your Spotify library to get started."
						: "Your Spotify library is connected."}
				</p>
			</div>

			{/* Link Spotify Button if needed */}
			{showLinkSpotify && (
				<Button
					onClick={() => {
						authClient.signIn.social({
							provider: "spotify",
							callbackURL:
								(env.NEXT_PUBLIC_DASHBOARD_URL?.replace(/\/$/, "") ||
									(typeof window !== "undefined"
										? window.location.origin
										: "")) + DASHBOARD_ROUTES.overview.path,
						});
					}}
				>
					Link Spotify
				</Button>
			)}

			{/* Main Action */}
			<AnalyzeMusicButton hasSpotifyLinked={!showLinkSpotify} />

			{/* Library Overview */}
			<LibraryOverview
				stats={libraryStats ?? null}
				isLoading={libraryStatsLoading}
			/>

			{/* Library Analysis */}
			<LibraryAnalysis />
		</div>
	);
}
