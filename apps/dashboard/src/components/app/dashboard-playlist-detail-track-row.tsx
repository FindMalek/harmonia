import type { PlaylistTrackItem } from "@harmonia/common/schemas";
import { parseJsonStringArray } from "@harmonia/common/utils/parse-json-string-array";
import { DASHBOARD_ROUTES } from "@harmonia/common/utils/routes";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";

export type DashboardPlaylistDetailTrackRowTrack = PlaylistTrackItem;

export function DashboardPlaylistDetailTrackRow({
	track,
	index,
}: {
	track: DashboardPlaylistDetailTrackRowTrack;
	index: number;
}) {
	const artists = parseJsonStringArray(track.artistNames);

	return (
		<Link
			href={DASHBOARD_ROUTES.tracks.children.detail.makePath(track.id) as Route}
			className="flex items-center gap-4 border-b py-4 last:border-b-0 hover:bg-accent/50"
		>
			<span className="w-6 shrink-0 text-right text-muted-foreground text-xs">
				{String(index + 1).padStart(2, "0")}
			</span>
			{track.albumImageUrl ? (
				<Image
					src={track.albumImageUrl}
					alt=""
					width={48}
					height={48}
					className="size-12 shrink-0 rounded object-cover"
					unoptimized
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
		</Link>
	);
}
