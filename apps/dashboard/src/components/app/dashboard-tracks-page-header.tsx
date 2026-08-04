"use client";

import type { TracksListSort } from "@harmonia/common/schemas";
import { Icons, Input } from "@harmonia/ui";
import { PageHeader } from "../shared/page-header";
import { DashboardTracksSortSelect } from "./dashboard-tracks-sort-select";

export function DashboardTracksPageHeader({
	search,
	onSearchChange,
	sort,
	onSortChange,
}: {
	search: string;
	onSearchChange: (value: string) => void;
	sort: TracksListSort;
	onSortChange: (value: TracksListSort) => void;
}) {
	return (
		<div className="sticky -top-5 z-10 -mx-4 -mt-4 flex flex-col gap-3 bg-background px-4 pt-4 pb-3">
			<PageHeader title="Tracks" description="Your full synced library." />
			<div className="flex items-center gap-2">
				<div className="relative flex-1">
					<Icons.search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						value={search}
						onChange={(e) => onSearchChange(e.target.value)}
						placeholder="Search tracks"
						aria-label="Search tracks"
						className="pl-9"
					/>
				</div>
				<DashboardTracksSortSelect value={sort} onChange={onSortChange} />
			</div>
		</div>
	);
}
