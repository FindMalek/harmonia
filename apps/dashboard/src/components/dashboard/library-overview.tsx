"use client";

import type { SpotifyLibraryStats } from "@harmonia/common/schemas";
import { StatRow } from "./stat-row";

type LibraryOverviewProps = {
	stats: SpotifyLibraryStats | null;
	isLoading: boolean;
};

export function LibraryOverviewSkeleton() {
	return (
		<div className="space-y-4">
			<h3 className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
				Library Overview
			</h3>
			<div className="space-y-0">
				<StatRow label="Playlists" value={0} loading={true} />
				<StatRow label="Tracks" value={0} loading={true} />
				<StatRow label="Artists" value={0} loading={true} />
				<StatRow label="Albums" value={0} loading={true} />
			</div>
		</div>
	);
}

export function LibraryOverview({ stats, isLoading }: LibraryOverviewProps) {
	return (
		<div className="space-y-4">
			<h3 className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
				Library Overview
			</h3>
			<div className="space-y-4">
				<StatRow
					label="Playlists"
					value={stats?.totalPlaylists ?? 0}
					loading={isLoading}
				/>
				<StatRow
					label="Tracks"
					value={stats?.totalTracks ?? 0}
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
