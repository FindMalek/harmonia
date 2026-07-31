import type { RefObject } from "react";
import { DashboardPlaylistDetailSectionLabel } from "./dashboard-playlist-detail-section-label";
import type { DashboardPlaylistDetailTrackRowTrack } from "./dashboard-playlist-detail-track-row";
import { DashboardPlaylistDetailTrackRow } from "./dashboard-playlist-detail-track-row";

export function DashboardPlaylistDetailTracklist({
	tracks,
	hasNextPage,
	sentinelRef,
}: {
	tracks: DashboardPlaylistDetailTrackRowTrack[];
	hasNextPage: boolean;
	sentinelRef: RefObject<HTMLDivElement | null>;
}) {
	return (
		<section className="flex flex-col">
			<DashboardPlaylistDetailSectionLabel label="TRACKLIST" />
			{tracks.map((track, index) => (
				<DashboardPlaylistDetailTrackRow
					key={track.id}
					track={track}
					index={index}
				/>
			))}
			{tracks.length === 0 ? (
				<p className="py-4 text-muted-foreground text-sm">No tracks yet.</p>
			) : null}
			{hasNextPage ? <div ref={sentinelRef} className="h-1" /> : null}
		</section>
	);
}
