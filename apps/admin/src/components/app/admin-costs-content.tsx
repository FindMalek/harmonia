"use client";

import type { AdminCostsRunItem } from "@sonaraem/common/schemas";
import { Badge, Button } from "@sonaraem/ui";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import {
	parseAsInteger,
	parseAsString,
	parseAsStringLiteral,
	useQueryStates,
} from "nuqs";
import { useState } from "react";

import { orpc } from "@/shared/api/orpc";
import { AdminCostsDetailSheet } from "./admin-costs-detail-sheet";
import { AdminDataTable } from "./admin-data-table";
import { AdminTablePagination } from "./admin-table-pagination";
import { AdminTableToolbar } from "./admin-table-toolbar";

const PROVIDER_OPTIONS = [
	{ value: "groq", label: "Groq" },
	{ value: "openai", label: "OpenAI" },
	{ value: "concentrate", label: "Concentrate" },
];

const COSTS_PARAMS = {
	page: parseAsInteger.withDefault(1),
	pageSize: parseAsInteger.withDefault(25),
	provider: parseAsStringLiteral(["groq", "openai", "concentrate"] as const),
	q: parseAsString.withDefault(""),
};

function formatCost(value: number): string {
	if (value === 0) return "—";
	return `$${value.toFixed(4)}`;
}

const columns: ColumnDef<AdminCostsRunItem>[] = [
	{
		id: "user",
		header: "User",
		cell: ({ row }) => (
			<div className="flex flex-col">
				<span className="text-sm">{row.original.userName}</span>
				<span className="text-muted-foreground text-xs">
					{row.original.userEmail}
				</span>
			</div>
		),
	},
	{
		accessorKey: "triggeredBy",
		header: "Trigger",
		cell: ({ row }) =>
			row.original.triggeredBy ? (
				<Badge variant="secondary">{row.original.triggeredBy}</Badge>
			) : (
				<span className="text-muted-foreground text-sm">—</span>
			),
	},
	{
		accessorKey: "status",
		header: "Status",
		cell: ({ row }) => <Badge variant="outline">{row.original.status}</Badge>,
	},
	{
		accessorKey: "startedAt",
		header: "Started",
		cell: ({ row }) =>
			row.original.startedAt
				? format(new Date(row.original.startedAt), "d MMM yyyy, HH:mm")
				: "—",
	},
	{
		accessorKey: "groqCostUsd",
		header: "Groq",
		cell: ({ row }) => formatCost(row.original.groqCostUsd),
	},
	{
		accessorKey: "openaiCostUsd",
		header: "OpenAI",
		cell: ({ row }) => formatCost(row.original.openaiCostUsd),
	},
	{
		accessorKey: "concentrateCostUsd",
		header: "Concentrate",
		cell: ({ row }) => formatCost(row.original.concentrateCostUsd),
	},
	{
		accessorKey: "totalCostUsd",
		header: "Total",
		cell: ({ row }) => (
			<span className="font-medium">
				{formatCost(row.original.totalCostUsd)}
			</span>
		),
	},
];

export function AdminCostsContent() {
	const [params, setParams] = useQueryStates(COSTS_PARAMS, {
		shallow: false,
		startTransition: undefined,
	});

	const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
	const [isSheetOpen, setIsSheetOpen] = useState(false);

	const { data, isFetching, isError, refetch } = useQuery(
		orpc.admin.costs.list.queryOptions({
			input: {
				page: params.page,
				pageSize: params.pageSize,
				q: params.q || undefined,
				provider: params.provider ?? undefined,
			},
		}),
	);

	return (
		<div className="space-y-4">
			<AdminTableToolbar
				searchPlaceholder="Search by name or email…"
				statusOptions={PROVIDER_OPTIONS}
				currentSearch={params.q}
				currentStatus={params.provider ?? undefined}
				onSearch={(value) => setParams({ q: value, page: 1 })}
				onStatusChange={(value) =>
					setParams({
						provider:
							value === "groq" || value === "openai" || value === "concentrate"
								? value
								: null,
						page: 1,
					})
				}
			/>

			{isError && !data ? (
				<div className="rounded-md border p-8 text-center">
					<p className="text-muted-foreground text-sm">Failed to load costs</p>
					<Button
						variant="link"
						size="sm"
						className="mt-2"
						onClick={() => refetch()}
					>
						Retry
					</Button>
				</div>
			) : (
				<>
					<AdminDataTable
						columns={columns}
						data={data?.items ?? []}
						isLoading={isFetching && !data}
						getRowId={(row) => String(row.runId)}
						onRowClick={(row) => {
							setSelectedRunId(row.runId);
							setIsSheetOpen(true);
						}}
					/>

					<AdminTablePagination
						total={data?.total ?? 0}
						page={params.page}
						pageSize={params.pageSize}
						pageCount={data?.pageCount ?? 1}
						onPageChange={(p) => setParams({ page: p })}
						onPageSizeChange={(size) => setParams({ pageSize: size, page: 1 })}
					/>
				</>
			)}

			<AdminCostsDetailSheet
				runId={selectedRunId}
				open={isSheetOpen}
				onOpenChange={setIsSheetOpen}
			/>
		</div>
	);
}
