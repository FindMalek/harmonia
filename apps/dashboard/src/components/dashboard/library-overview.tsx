"use client";

import { StatRow } from "./stat-row";

type LibraryOverviewProps = {
	stats: {
		totalTracks: number;
		totalPlaylists: number;
		uniqueAlbums: number;
		uniqueArtists: number;
	} | null;
	isLoading: boolean;
};

export function LibraryOverview({ stats, isLoading }: LibraryOverviewProps) {
	return (
		<div className="space-y-4">
			<h3 className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
				Library Overview
			</h3>
			<div className="space-y-0">
				<StatRow
					label="Tracks"
					value={stats?.totalTracks ?? 0}
					loading={isLoading}
				/>
				<StatRow
					label="Playlists"
					value={stats?.totalPlaylists ?? 0}
					loading={isLoading}
				/>
				<StatRow
					label="Artists"
					value={stats?.uniqueArtists ?? 0}
					loading={isLoading}
				/>
				<StatRow
					label="Albums"
					value={stats?.uniqueAlbums ?? 0}
					loading={isLoading}
				/>
			</div>
		</div>
	);
}
