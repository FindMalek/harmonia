import { DashboardPlaylistDetailSectionLabel } from "./dashboard-playlist-detail-section-label";
import { DashboardPlaylistDetailTrackRow } from "./dashboard-playlist-detail-track-row";
import type { DashboardPlaylistDetailTrackRowTrack } from "./dashboard-playlist-detail-track-row";

export function DashboardPlaylistDetailTracklist({
	tracks,
}: {
	tracks: DashboardPlaylistDetailTrackRowTrack[];
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
		</section>
	);
}
