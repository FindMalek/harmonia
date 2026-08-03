"use client";

import type { PlaylistSort } from "@harmonia/common/schemas";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
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
		<Select
			value={value}
			onValueChange={(next) => onChange(next as PlaylistSort)}
		>
			<SelectTrigger className="w-44 rounded-none" aria-label="Sort playlists">
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
