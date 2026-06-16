"use client";

import { Button } from "@harmonia/ui";

type AdminTablePaginationProps = {
	total: number;
	page: number;
	pageSize: number;
	pageCount: number;
	onPageChange: (page: number) => void;
	onPageSizeChange: (pageSize: number) => void;
};

export function AdminTablePagination({
	total,
	page,
	pageSize,
	pageCount,
	onPageChange,
	onPageSizeChange,
}: AdminTablePaginationProps) {
	const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
	const to = Math.min(page * pageSize, total);

	return (
		<div className="flex items-center justify-between gap-4 text-sm">
			<span className="text-muted-foreground">
				{total === 0 ? "No results" : `${from}–${to} of ${total}`}
			</span>
			<div className="flex items-center gap-2">
				<label className="flex items-center gap-1 text-muted-foreground">
					Rows
					<select
						value={pageSize}
						onChange={(e) => onPageSizeChange(Number(e.target.value))}
						className="rounded border bg-background px-1 py-0.5 text-foreground text-sm"
					>
						{[25, 50, 100].map((size) => (
							<option key={size} value={size}>
								{size}
							</option>
						))}
					</select>
				</label>
				<Button
					variant="outline"
					size="sm"
					onClick={() => onPageChange(page - 1)}
					disabled={page <= 1}
				>
					Previous
				</Button>
				<span className="text-muted-foreground">
					{page} / {pageCount || 1}
				</span>
				<Button
					variant="outline"
					size="sm"
					onClick={() => onPageChange(page + 1)}
					disabled={page >= pageCount}
				>
					Next
				</Button>
			</div>
		</div>
	);
}
