"use client";

import {
	Icons,
	Input,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@sonaraem/ui";
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

	useEffect(() => {
		return () => clearTimeout(debounceRef.current);
	}, []);

	function handleSearchChange(value: string) {
		setLocalSearch(value);
		clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => onSearch(value), 300);
	}

	return (
		<div className="flex flex-wrap items-center gap-2">
			<div className="relative">
				<Icons.search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
				<Input
					placeholder={searchPlaceholder}
					value={localSearch}
					onChange={(e) => handleSearchChange(e.target.value)}
					className="h-8 w-64 pl-8"
				/>
			</div>

			{statusOptions && (
				<Select
					value={currentStatus ?? "all"}
					onValueChange={(val) =>
						onStatusChange(val === "all" ? undefined : val)
					}
				>
					<SelectTrigger className="h-8 w-36">
						<SelectValue placeholder="All statuses" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All statuses</SelectItem>
						{statusOptions.map((opt) => (
							<SelectItem key={opt.value} value={opt.value}>
								{opt.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			)}
		</div>
	);
}
