"use client";

import type { PlaylistTrackSort } from "@harmonia/common/schemas";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@harmonia/ui";

const SORT_OPTIONS: Array<{ value: PlaylistTrackSort; label: string }> = [
	{ value: "default", label: "Harmonia order" },
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
		<Select
			value={value}
			onValueChange={(next) => onChange(next as PlaylistTrackSort)}
		>
			<SelectTrigger
				className="w-36 shrink-0 rounded-none"
				aria-label="Sort tracks"
			>
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{SORT_OPTIONS.map((option) => (
					<SelectItem key={option.value} value={option.value}>
						{option.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
