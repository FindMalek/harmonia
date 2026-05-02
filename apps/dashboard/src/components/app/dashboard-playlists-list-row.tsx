import { cn } from "@/lib/utils";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbSeparator,
	Icons,
	Skeleton,
} from "@harmonia/ui";
import Link from "next/link";
import { Fragment } from "react";

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
	const tags = playlist.tags?.filter(Boolean) ?? [];

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
			{tags.length > 0 ? (
				<Breadcrumb aria-label="Playlist tags" className="mt-3">
					<BreadcrumbList className="gap-1 text-[11px] leading-relaxed sm:text-xs">
						{tags.map((tag, index) => (
							<Fragment key={`${playlist.id}-tag-${index}`}>
								{index > 0 ? (
									<BreadcrumbSeparator className="pointer-events-none [&>svg]:hidden">
										<span className="text-muted-foreground">/</span>
									</BreadcrumbSeparator>
								) : null}
								<BreadcrumbItem className="gap-0">
									<span className="font-normal text-muted-foreground lowercase">
										{tag}
									</span>
								</BreadcrumbItem>
							</Fragment>
						))}
					</BreadcrumbList>
				</Breadcrumb>
			) : null}
		</Link>
	);
}

const PLAYLIST_LIST_SKELETON_ROW_KEYS = [
	"pl-sk-1",
	"pl-sk-2",
	"pl-sk-3",
	"pl-sk-4",
] as const;

export function DashboardPlaylistsListSkeleton() {
	return (
		<div className="divide-y divide-border">
			{PLAYLIST_LIST_SKELETON_ROW_KEYS.map((rowKey) => (
				<div key={rowKey} className="space-y-3 py-6">
					<div className="flex items-center justify-between gap-3">
						<Skeleton className="h-3 w-24" />
						<Skeleton className="size-5 shrink-0 rounded-none" />
					</div>
					<Skeleton className="h-6 w-3/5 max-w-xs" />
					<Skeleton className="h-4 w-full max-w-md" />
					<Skeleton className="h-3 w-4/5 max-w-sm" />
				</div>
			))}
		</div>
	);
}
