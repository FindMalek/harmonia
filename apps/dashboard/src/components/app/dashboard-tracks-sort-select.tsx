"use client";

import type { TracksListSort } from "@sonaraem/common/schemas";
import {
	Button,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
	Icons,
} from "@sonaraem/ui";

const SORT_OPTIONS: Array<{ value: TracksListSort; label: string }> = [
	{ value: "recent", label: "Recently added" },
	{ value: "album", label: "By album" },
];

export function DashboardTracksSortSelect({
	value,
	onChange,
}: {
	value: TracksListSort;
	onChange: (value: TracksListSort) => void;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					type="button"
					variant="outline"
					className="size-11 shrink-0 rounded-none"
					aria-label="Sort tracks"
				>
					<Icons.sort className="size-5 shrink-0" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-48">
				<DropdownMenuRadioGroup
					value={value}
					onValueChange={(next) => onChange(next as TracksListSort)}
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
