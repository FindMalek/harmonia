"use client";

import type { PlaylistTrackSort } from "@sonaraem/common/schemas";
import { DASHBOARD_ROUTES } from "@sonaraem/common/utils/routes";
import { cn, Icons, Input } from "@sonaraem/ui";
import { DashboardDetailBackLink } from "@/components/shared/dashboard-detail-back-link";
import { DashboardPlaylistTracklistSortSelect } from "./dashboard-playlist-tracklist-sort-select";

export function DashboardPlaylistDetailHeader({
	name,
	description,
	scrolled,
	trackSearch,
	onTrackSearchChange,
	trackSort,
	onTrackSortChange,
}: {
	name: string;
	description: string | null;
	scrolled: boolean;
	trackSearch: string;
	onTrackSearchChange: (value: string) => void;
	trackSort: PlaylistTrackSort;
	onTrackSortChange: (value: PlaylistTrackSort) => void;
}) {
	return (
		<div className="sticky -top-5 z-10 -mx-4 -mt-4 bg-background px-4 pt-4 pb-3">
			<DashboardDetailBackLink
				href={DASHBOARD_ROUTES.playlists.path}
				label="Playlists"
			/>

			<div
				className={cn(
					"overflow-hidden transition-all duration-200 ease-out",
					scrolled ? "mt-0 max-h-0 opacity-0" : "mt-3 max-h-24 opacity-100",
				)}
			>
				<h1 className="font-bold text-2xl tracking-tight">{name}</h1>
				{description ? (
					<p className="mt-1 text-muted-foreground text-sm">{description}</p>
				) : null}
			</div>

			{scrolled ? (
				<p className="mt-3 truncate font-medium text-sm">{name}</p>
			) : null}

			<div className="mt-3 flex items-center gap-2">
				<div className="relative flex-1">
					<Icons.search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						value={trackSearch}
						onChange={(e) => onTrackSearchChange(e.target.value)}
						placeholder="Search tracks"
						aria-label="Search tracks"
						className="pl-9"
					/>
				</div>
				<DashboardPlaylistTracklistSortSelect
					value={trackSort}
					onChange={onTrackSortChange}
				/>
			</div>
		</div>
	);
}
