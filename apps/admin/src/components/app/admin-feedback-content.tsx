"use client";

import type { FeedbackAdminItem } from "@sonaraem/common/schemas";
import { Badge } from "@sonaraem/ui";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { useState } from "react";

import { orpc } from "@/shared/api/orpc";
import { AdminDataTable } from "./admin-data-table";
import { AdminFeedbackDetailSheet } from "./admin-feedback-detail-sheet";
import { AdminTablePagination } from "./admin-table-pagination";
import { AdminTableToolbar } from "./admin-table-toolbar";

const SOURCE_LABELS: Record<FeedbackAdminItem["source"], string> = {
	email_feedback_3day: "3-day email",
	in_app: "In-app",
};

const FEEDBACK_PARAMS = {
	page: parseAsInteger.withDefault(1),
	pageSize: parseAsInteger.withDefault(25),
	q: parseAsString.withDefault(""),
};

export function AdminFeedbackContent() {
	const [params, setParams] = useQueryStates(FEEDBACK_PARAMS, {
		shallow: false,
		startTransition: undefined,
	});

	const page = params.page;
	const pageSize = params.pageSize;
	const q = params.q;

	const [selectedItem, setSelectedItem] = useState<FeedbackAdminItem | null>(
		null,
	);
	const [isSheetOpen, setIsSheetOpen] = useState(false);

	const { data, isFetching } = useQuery(
		orpc.admin.feedback.list.queryOptions({
			input: { page, pageSize, q: q || undefined },
		}),
	);

	const columns: ColumnDef<FeedbackAdminItem>[] = [
		{
			accessorKey: "userEmail",
			header: "From",
			cell: ({ row }) => row.original.userEmail ?? "—",
		},
		{
			accessorKey: "message",
			header: "Message",
			cell: ({ row }) => (
				<span className="line-clamp-2 max-w-md text-muted-foreground">
					{row.original.message}
				</span>
			),
		},
		{
			accessorKey: "rating",
			header: "Rating",
			cell: ({ row }) =>
				row.original.rating != null ? (
					<Badge variant="secondary">{row.original.rating} / 5</Badge>
				) : (
					"—"
				),
		},
		{
			accessorKey: "source",
			header: "Source",
			cell: ({ row }) => (
				<Badge variant="outline">{SOURCE_LABELS[row.original.source]}</Badge>
			),
		},
		{
			accessorKey: "createdAt",
			header: "Submitted",
			cell: ({ row }) => format(new Date(row.original.createdAt), "d MMM yyyy"),
		},
	];

	return (
		<div className="space-y-4">
			<AdminTableToolbar
				searchPlaceholder="Search by email or message…"
				currentSearch={q}
				currentStatus={undefined}
				onSearch={(value) => setParams({ q: value, page: 1 })}
				onStatusChange={() => {}}
			/>

			<AdminDataTable
				columns={columns}
				data={data?.items ?? []}
				isLoading={isFetching && !data}
				getRowId={(row) => String(row.id)}
				onRowClick={(row) => {
					setSelectedItem(row);
					setIsSheetOpen(true);
				}}
			/>

			<AdminTablePagination
				total={data?.total ?? 0}
				page={page}
				pageSize={pageSize}
				pageCount={data?.pageCount ?? 1}
				onPageChange={(p) => setParams({ page: p })}
				onPageSizeChange={(size) => setParams({ pageSize: size, page: 1 })}
			/>

			<AdminFeedbackDetailSheet
				item={selectedItem}
				open={isSheetOpen}
				onOpenChange={setIsSheetOpen}
			/>
		</div>
	);
}
