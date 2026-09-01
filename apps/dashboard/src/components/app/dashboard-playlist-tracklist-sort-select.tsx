"use client";

import type { PlaylistTrackSort } from "@sonaraem/common/schemas";
import {
	Button,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
	Icons,
} from "@sonaraem/ui";

const SORT_OPTIONS: Array<{ value: PlaylistTrackSort; label: string }> = [
	{ value: "default", label: "Sonaraem order" },
	{ value: "name", label: "Name (A-Z)" },
	{ value: "duration", label: "Duration" },
];

export function DashboardPlaylistTracklistSortSelect({
	value,
	onChange,
}: {
	value: PlaylistTrackSort;
	onChange: (value: PlaylistTrackSort) => void;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					type="button"
					variant="outline"
					size="icon"
					className="shrink-0 rounded-none"
					aria-label="Sort tracks"
				>
					<Icons.sort className="size-4 shrink-0" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-44">
				<DropdownMenuRadioGroup
					value={value}
					onValueChange={(next) => onChange(next as PlaylistTrackSort)}
				>
					{SORT_OPTIONS.map((option) => (
						<DropdownMenuRadioItem key={option.value} value={option.value}>
							{option.label}
						</DropdownMenuRadioItem>
					))}
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
