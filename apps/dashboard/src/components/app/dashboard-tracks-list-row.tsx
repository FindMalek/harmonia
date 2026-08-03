import type { TracksListOutput } from "@harmonia/common/schemas";
import { parseJsonStringArray } from "@harmonia/common/utils/parse-json-string-array";
import { DASHBOARD_ROUTES } from "@harmonia/common/utils/routes";
import { Skeleton } from "@harmonia/ui";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";

export type DashboardTracksListRowTrack = TracksListOutput["tracks"][number];

export function DashboardTracksListRow({
	track,
}: {
	track: DashboardTracksListRowTrack;
}) {
	const artists = parseJsonStringArray(track.artistNames);

	return (
		<Link
			href={DASHBOARD_ROUTES.tracks.children.detail.makePath(track.id) as Route}
			className="flex items-center gap-4 border-b py-4 last:border-b-0 hover:bg-accent/50"
		>
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

export function DashboardTracksListRowSkeleton() {
	return (
		<div className="flex items-center gap-4 border-b py-4 last:border-b-0">
			<Skeleton className="size-12 shrink-0 rounded" />
			<div className="min-w-0 flex-1 space-y-2">
				<Skeleton className="h-4 w-2/5" />
				<Skeleton className="h-3 w-3/5" />
			</div>
		</div>
	);
}

const TRACKS_SKELETON_KEYS = [
	"tr-sk-1",
	"tr-sk-2",
	"tr-sk-3",
	"tr-sk-4",
	"tr-sk-5",
	"tr-sk-6",
] as const;

export function DashboardTracksListSkeleton() {
	return (
		<div className="divide-y divide-border">
			{TRACKS_SKELETON_KEYS.map((key) => (
				<DashboardTracksListRowSkeleton key={key} />
			))}
		</div>
	);
}
