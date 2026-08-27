"use client";

import {
	Button,
	Icons,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@sonaraem/ui";

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
		<div className="flex items-center justify-between gap-4">
			<span className="text-muted-foreground text-xs">
				{total === 0 ? "No results" : `${from}–${to} of ${total}`}
			</span>

			<div className="flex items-center gap-3">
				<div className="flex items-center gap-1.5">
					<span className="text-muted-foreground text-xs">Rows per page</span>
					<Select
						value={String(pageSize)}
						onValueChange={(val) => onPageSizeChange(Number(val))}
					>
						<SelectTrigger className="h-7 w-16">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{[25, 50, 100].map((size) => (
								<SelectItem key={size} value={String(size)}>
									{size}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<span className="text-muted-foreground text-xs tabular-nums">
					{page} / {pageCount || 1}
				</span>

				<div className="flex items-center gap-1">
					<Button
						variant="outline"
						size="icon-sm"
						onClick={() => onPageChange(page - 1)}
						disabled={page <= 1}
					>
						<Icons.chevronLeft />
					</Button>
					<Button
						variant="outline"
						size="icon-sm"
						onClick={() => onPageChange(page + 1)}
						disabled={page >= pageCount}
					>
						<Icons.chevronRight />
					</Button>
				</div>
			</div>
		</div>
	);
}
