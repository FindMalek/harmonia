"use client";

import { Input } from "@harmonia/ui";
import { useEffect, useRef, useState } from "react";

type StatusOption = { value: string; label: string };

type AdminTableToolbarProps = {
	searchPlaceholder?: string;
	statusOptions?: StatusOption[];
	currentSearch: string;
	currentStatus: string | undefined;
	onSearch: (q: string) => void;
	onStatusChange: (status: string | undefined) => void;
};

export function AdminTableToolbar({
	searchPlaceholder = "Search…",
	statusOptions,
	currentSearch,
	currentStatus,
	onSearch,
	onStatusChange,
}: AdminTableToolbarProps) {
	const [localSearch, setLocalSearch] = useState(currentSearch);
	const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

	useEffect(() => {
		setLocalSearch(currentSearch);
	}, [currentSearch]);

	function handleSearchChange(value: string) {
		setLocalSearch(value);
		clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => {
			onSearch(value);
		}, 300);
	}

	return (
		<div className="flex flex-wrap items-center gap-2">
			<Input
				placeholder={searchPlaceholder}
				value={localSearch}
				onChange={(e) => handleSearchChange(e.target.value)}
				className="h-8 w-64"
			/>
			{statusOptions && (
				<select
					value={currentStatus ?? ""}
					onChange={(e) => onStatusChange(e.target.value || undefined)}
					className="h-8 rounded-md border bg-background px-2 text-sm text-foreground"
				>
					<option value="">All statuses</option>
					{statusOptions.map((opt) => (
						<option key={opt.value} value={opt.value}>
							{opt.label}
						</option>
					))}
				</select>
			)}
		</div>
	);
}
