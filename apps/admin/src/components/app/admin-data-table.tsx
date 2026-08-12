"use client";

import {
	Skeleton,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@harmonia/ui";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	type RowSelectionState,
	useReactTable,
} from "@tanstack/react-table";

type AdminDataTableProps<TData> = {
	columns: ColumnDef<TData>[];
	data: TData[];
	isLoading?: boolean;
	getRowId?: (row: TData) => string;
	rowSelection?: RowSelectionState;
	onRowSelectionChange?: (selection: RowSelectionState) => void;
	onRowClick?: (row: TData) => void;
};

export function AdminDataTable<TData>({
	columns,
	data,
	isLoading,
	getRowId,
	rowSelection,
	onRowSelectionChange,
	onRowClick,
}: AdminDataTableProps<TData>) {
	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
		manualPagination: true,
		manualFiltering: true,
		manualSorting: true,
		getRowId,
		enableRowSelection: !!onRowSelectionChange,
		state: { rowSelection },
		onRowSelectionChange: (updater) => {
			if (!onRowSelectionChange) return;
			const next =
				typeof updater === "function" ? updater(rowSelection ?? {}) : updater;
			onRowSelectionChange(next);
		},
	});

	if (isLoading) {
		return <AdminDataTableSkeleton columnCount={columns.length} />;
	}

	return (
		<div className="rounded-md border">
			<Table>
				<TableHeader>
					{table.getHeaderGroups().map((headerGroup) => (
						<TableRow key={headerGroup.id}>
							{headerGroup.headers.map((header) => (
								<TableHead key={header.id}>
									{header.isPlaceholder
										? null
										: flexRender(
												header.column.columnDef.header,
												header.getContext(),
											)}
								</TableHead>
							))}
						</TableRow>
					))}
				</TableHeader>
				<TableBody>
					{table.getRowModel().rows.length > 0 ? (
						table.getRowModel().rows.map((row) => (
							<TableRow
								key={row.id}
								onClick={
									onRowClick ? () => onRowClick(row.original) : undefined
								}
								className={onRowClick ? "cursor-pointer" : undefined}
							>
								{row.getVisibleCells().map((cell) => (
									<TableCell key={cell.id}>
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</TableCell>
								))}
							</TableRow>
						))
					) : (
						<TableRow>
							<TableCell
								colSpan={columns.length}
								className="h-24 text-center text-muted-foreground"
							>
								No results
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
		</div>
	);
}

export function AdminDataTableSkeleton({
	columnCount = 4,
	rowCount = 8,
}: {
	columnCount?: number;
	rowCount?: number;
}) {
	return (
		<div className="rounded-md border">
			<Table>
				<TableHeader>
					<TableRow>
						{Array.from({ length: columnCount }).map((_, i) => (
							<TableHead key={i}>
								<Skeleton className="h-4 w-20" />
							</TableHead>
						))}
					</TableRow>
				</TableHeader>
				<TableBody>
					{Array.from({ length: rowCount }).map((_, i) => (
						<TableRow key={i}>
							{Array.from({ length: columnCount }).map((_, j) => (
								<TableCell key={j}>
									<Skeleton className="h-4 w-full" />
								</TableCell>
							))}
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
