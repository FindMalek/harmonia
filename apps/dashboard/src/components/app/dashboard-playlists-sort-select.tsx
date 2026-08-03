"use client";

import type { PlaylistSort } from "@harmonia/common/schemas";
import {
	Button,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
	Icons,
} from "@harmonia/ui";

const SORT_OPTIONS: Array<{ value: PlaylistSort; label: string }> = [
	{ value: "recent", label: "Recently created" },
	{ value: "name", label: "Name (A-Z)" },
	{ value: "trackCount", label: "Track count" },
];

export function DashboardPlaylistsSortSelect({
	value,
	onChange,
}: {
	value: PlaylistSort;
	onChange: (value: PlaylistSort) => void;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					type="button"
					variant="outline"
					className="size-11 shrink-0 rounded-none"
					aria-label="Sort playlists"
				>
					<Icons.sort className="size-5 shrink-0" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-48">
				<DropdownMenuRadioGroup
					value={value}
					onValueChange={(next) => onChange(next as PlaylistSort)}
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
