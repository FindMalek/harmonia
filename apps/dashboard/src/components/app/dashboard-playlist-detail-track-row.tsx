import type { PlaylistGetByIdOutput } from "@harmonia/common/schemas";

export type DashboardPlaylistDetailTrackRowTrack =
	PlaylistGetByIdOutput["tracks"][number];

function safeParseArtistNames(json: string): string[] {
	try {
		const parsed = JSON.parse(json);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

export function DashboardPlaylistDetailTrackRow({
	track,
	index,
}: {
	track: DashboardPlaylistDetailTrackRowTrack;
	index: number;
}) {
	const artists = safeParseArtistNames(track.artistNames);

	return (
		<div className="flex items-center gap-4 border-b py-4 last:border-b-0">
			<span className="w-6 shrink-0 text-right text-muted-foreground text-sm">
				{String(index + 1).padStart(2, "0")}
			</span>
			{track.albumImageUrl ? (
				<img
					src={track.albumImageUrl}
					alt=""
					className="size-12 shrink-0 rounded object-cover"
				/>
			) : (
				<div className="size-12 shrink-0 rounded bg-muted" />
			)}
			<div className="min-w-0 flex-1">
				<p className="truncate font-medium text-sm">{track.name}</p>
				<p className="truncate text-muted-foreground text-xs">
					{artists.join(", ")}
					{track.albumName ? ` • ${track.albumName}` : ""}
				</p>
			</div>
		</div>
	);
}
