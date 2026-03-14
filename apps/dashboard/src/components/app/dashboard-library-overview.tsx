"use client";

import type { SpotifyLibraryStats } from "@harmonia/common/schemas";
import { DashboardStatRow } from "./dashboard-stat-row";

type LibraryOverviewProps = {
	stats: SpotifyLibraryStats | null;
	isLoading: boolean;
};

export function DashboardLibraryOverviewSkeleton() {
	return (
		<div className="space-y-4">
			<h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
				Library Overview
			</h3>
			<div className="space-y-0">
				<DashboardStatRow label="Playlists" value={0} loading={true} />
				<DashboardStatRow label="Tracks" value={0} loading={true} />
				<DashboardStatRow label="Artists" value={0} loading={true} />
				<DashboardStatRow label="Albums" value={0} loading={true} />
			</div>
		</div>
	);
}

export function DashboardLibraryOverview({
	stats,
	isLoading,
}: LibraryOverviewProps) {
	return (
		<div className="space-y-4">
			<h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
				Library Overview
			</h3>
			<div className="space-y-4">
				<DashboardStatRow
					label="Playlists"
					value={stats?.totalPlaylists ?? 0}
					loading={isLoading}
				/>
				<DashboardStatRow
					label="Tracks"
					value={stats?.totalTracks ?? 0}
					loading={isLoading}
				/>
				<DashboardStatRow
					label="Artists"
					value={stats?.uniqueArtists ?? 0}
					loading={isLoading}
				/>
				<DashboardStatRow
					label="Albums"
					value={stats?.uniqueAlbums ?? 0}
					loading={isLoading}
				/>
			</div>
		</div>
	);
}
