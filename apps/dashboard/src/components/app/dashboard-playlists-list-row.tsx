import { cn } from "@/lib/utils";
import { Icons } from "@harmonia/ui";
import Link from "next/link";

export type DashboardPlaylistsListRowPlaylist = {
	id: number;
	name: string;
	description: string | null;
	trackCount: number;
	tags: string[] | null;
};

export function DashboardPlaylistsListRow({
	playlist,
	className,
}: {
	playlist: DashboardPlaylistsListRowPlaylist;
	className?: string;
}) {
	const tagLine =
		playlist.tags && playlist.tags.length > 0
			? playlist.tags.map((t) => t.toLowerCase()).join(" / ")
			: null;

	return (
		<Link
			href={`/playlists/${playlist.id}`}
			className={cn(
				"block py-6",
				"focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
				className,
			)}
		>
			<div className="flex items-center justify-between gap-3">
				<p className="text-muted-foreground text-xs uppercase tracking-wide">
					{playlist.trackCount} tracks
				</p>
				<span
					className="flex size-11 shrink-0 items-center justify-end text-muted-foreground"
					aria-hidden
				>
					<Icons.arrowUpRight className="size-5" />
				</span>
			</div>
			<h2 className="mt-3 font-bold text-foreground text-xl leading-tight tracking-tight">
				{playlist.name}
			</h2>
			{playlist.description ? (
				<p className="mt-2 text-muted-foreground text-sm leading-snug">
					{playlist.description}
				</p>
			) : null}
			{tagLine ? (
				<p className="mt-3 text-muted-foreground text-xs leading-relaxed">
					{tagLine}
				</p>
			) : null}
		</Link>
	);
}
