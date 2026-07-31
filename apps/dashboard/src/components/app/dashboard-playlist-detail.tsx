"use client";

import type { PlaylistGetByIdOutput } from "@harmonia/common/schemas";
import { DASHBOARD_ROUTES } from "@harmonia/common/utils/routes";
import { Skeleton } from "@harmonia/ui";
import { DashboardDetailBackLink } from "@/components/shared/dashboard-detail-back-link";
import { DashboardPlaylistDetailActions } from "./dashboard-playlist-detail-actions";
import { DashboardPlaylistDetailMetadata } from "./dashboard-playlist-detail-metadata";
import { DashboardPlaylistDetailTracklist } from "./dashboard-playlist-detail-tracklist";

export function DashboardPlaylistDetail({
	playlist,
	exportPending,
	onExport,
	autoSyncPending,
	onToggleAutoSync,
}: {
	playlist: PlaylistGetByIdOutput;
	exportPending: boolean;
	onExport: () => void;
	autoSyncPending: boolean;
	onToggleAutoSync: (checked: boolean) => void;
}) {
	const themesLine = playlist.themes?.join(", ") ?? null;

	return (
		<div className="flex flex-col gap-6">
			<DashboardDetailBackLink
				href={DASHBOARD_ROUTES.playlists.path}
				label="Playlists"
			/>

			<div className="flex flex-col gap-1">
				<h1 className="font-bold text-2xl tracking-tight">{playlist.name}</h1>
				{playlist.description ? (
					<p className="text-muted-foreground text-sm">
						{playlist.description}
					</p>
				) : null}
			</div>

			<DashboardPlaylistDetailMetadata
				trackCount={playlist.trackCount}
				mood={playlist.mood}
				energy={playlist.energy}
				themesLine={themesLine}
			/>

			<DashboardPlaylistDetailActions
				spotifyPlaylistId={playlist.spotifyPlaylistId}
				exportedAt={playlist.exportedAt}
				autoSyncEnabled={playlist.autoSyncEnabled}
				autoSyncPending={autoSyncPending}
				onToggleAutoSync={onToggleAutoSync}
				exportPending={exportPending}
				onExport={onExport}
			/>

			<DashboardPlaylistDetailTracklist tracks={playlist.tracks} />
		</div>
	);
}

const SKELETON_METADATA_KEYS = [
	"sk-md-1",
	"sk-md-2",
	"sk-md-3",
	"sk-md-4",
] as const;
const SKELETON_TRACK_KEYS = [
	"sk-tr-1",
	"sk-tr-2",
	"sk-tr-3",
	"sk-tr-4",
	"sk-tr-5",
	"sk-tr-6",
	"sk-tr-7",
	"sk-tr-8",
] as const;

export function DashboardPlaylistDetailSkeleton() {
	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-2">
				<Skeleton className="h-3 w-20" />
				<Skeleton className="h-px w-full" />
			</div>
			<div className="flex flex-col gap-2">
				<Skeleton className="h-8 w-64" />
				<Skeleton className="h-4 w-96" />
			</div>
			<div className="flex flex-col gap-2">
				{SKELETON_METADATA_KEYS.map((key) => (
					<Skeleton key={key} className="h-12 w-full" />
				))}
			</div>
			<div className="flex flex-col gap-2">
				<Skeleton className="h-10 w-full" />
				<Skeleton className="h-10 w-full" />
			</div>
			<div className="flex flex-col gap-2">
				{SKELETON_TRACK_KEYS.map((key) => (
					<Skeleton key={key} className="h-16 w-full" />
				))}
			</div>
		</div>
	);
}

export function DashboardPlaylistDetailNotFound() {
	return (
		<div className="flex flex-col gap-6">
			<DashboardDetailBackLink
				href={DASHBOARD_ROUTES.playlists.path}
				label="Playlists"
			/>
			<p className="text-muted-foreground text-sm">Playlist not found.</p>
		</div>
	);
}
