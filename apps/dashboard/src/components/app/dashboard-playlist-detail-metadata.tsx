import { DashboardPlaylistDetailMetadataRow } from "./dashboard-playlist-detail-metadata-row";
import { DashboardPlaylistDetailSectionLabel } from "./dashboard-playlist-detail-section-label";

export function DashboardPlaylistDetailMetadata({
	trackCount,
	mood,
	energy,
	themesLine,
}: {
	trackCount: number;
	mood: string | null;
	energy: string | null;
	themesLine: string | null;
}) {
	return (
		<section className="flex flex-col">
			<DashboardPlaylistDetailSectionLabel label="METADATA" />
			<DashboardPlaylistDetailMetadataRow
				label="Tracks"
				value={String(trackCount)}
			/>
			{mood ? (
				<DashboardPlaylistDetailMetadataRow label="Mood" value={mood} />
			) : null}
			{energy ? (
				<DashboardPlaylistDetailMetadataRow label="Energy" value={energy} />
			) : null}
			{themesLine ? (
				<DashboardPlaylistDetailMetadataRow label="Themes" value={themesLine} />
			) : null}
		</section>
	);
}
