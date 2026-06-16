"use client";

import type {
	WaitlistAdminItem,
	WaitlistStatus,
} from "@harmonia/common/schemas";
import { Badge } from "@harmonia/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import {
	parseAsInteger,
	parseAsString,
	parseAsStringLiteral,
	useQueryStates,
} from "nuqs";
import { useCallback, useState } from "react";

import { toastError } from "@/shared/api/error-handler";
import { orpc } from "@/shared/api/orpc";
import { adminQueryKeys } from "@/shared/lib/admin/query-keys";
import { AdminDataTable } from "./admin-data-table";
import { AdminRowActions } from "./admin-row-actions";
import { AdminTablePagination } from "./admin-table-pagination";
import { AdminTableToolbar } from "./admin-table-toolbar";
import { AdminWaitlistDetailSheet } from "./admin-waitlist-detail-sheet";

const STATUS_OPTIONS = [
	{ value: "pending", label: "Pending" },
	{ value: "approved", label: "Approved" },
	{ value: "rejected", label: "Rejected" },
];

const STATUS_VARIANTS = {
	pending: "secondary",
	approved: "default",
	rejected: "destructive",
} as const;

const WAITLIST_PARAMS = {
	page: parseAsInteger.withDefault(1),
	pageSize: parseAsInteger.withDefault(25),
	status: parseAsStringLiteral(["pending", "approved", "rejected"] as const),
	q: parseAsString.withDefault(""),
};

export function AdminWaitlistContent() {
	const queryClient = useQueryClient();

	const [params, setParams] = useQueryStates(WAITLIST_PARAMS, {
		shallow: false,
		startTransition: undefined,
	});

	const page = params.page;
	const pageSize = params.pageSize;
	const status = params.status ?? undefined;
	const q = params.q;

	const [selectedItem, setSelectedItem] = useState<WaitlistAdminItem | null>(
		null,
	);
	const [isSheetOpen, setIsSheetOpen] = useState(false);

	const { data, isFetching } = useQuery(
		orpc.admin.waitlist.list.queryOptions({
			input: { page, pageSize, status, q: q || undefined },
		}),
	);

	const { mutate: updateStatus, isPending: isActionLoading } = useMutation(
		orpc.admin.waitlist.updateStatus.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: adminQueryKeys.waitlist.all,
				});
				queryClient.invalidateQueries({ queryKey: adminQueryKeys.stats });
				setIsSheetOpen(false);
			},
			onError: toastError,
		}),
	);

	const handleApprove = useCallback(
		(id: number) => updateStatus({ id, status: "approved" }),
		[updateStatus],
	);

	const handleReject = useCallback(
		(id: number) => updateStatus({ id, status: "rejected" }),
		[updateStatus],
	);

	const columns: ColumnDef<WaitlistAdminItem>[] = [
		{
			accessorKey: "email",
			header: "Email",
		},
		{
			accessorKey: "status",
			header: "Status",
			cell: ({ row }) => (
				<Badge variant={STATUS_VARIANTS[row.original.status]}>
					{row.original.status}
				</Badge>
			),
		},
		{
			accessorKey: "createdAt",
			header: "Signed up",
			cell: ({ row }) => format(new Date(row.original.createdAt), "d MMM yyyy"),
		},
		{
			accessorKey: "approvedAt",
			header: "Approved at",
			cell: ({ row }) =>
				row.original.approvedAt
					? format(new Date(row.original.approvedAt), "d MMM yyyy")
					: "—",
		},
		{
			id: "actions",
			header: "",
			cell: ({ row }) => (
				<AdminRowActions
					actions={[
						{
							label: "View details",
							onClick: () => {
								setSelectedItem(row.original);
								setIsSheetOpen(true);
							},
						},
						...(row.original.status !== "approved"
							? [
									{
										label: "Approve",
										onClick: () => handleApprove(row.original.id),
									},
								]
							: []),
						...(row.original.status === "pending"
							? [
									{
										label: "Reject",
										onClick: () => handleReject(row.original.id),
										variant: "destructive" as const,
									},
								]
							: []),
					]}
				/>
			),
		},
	];

	return (
		<div className="space-y-4">
			<AdminTableToolbar
				searchPlaceholder="Search by email…"
				statusOptions={STATUS_OPTIONS}
				currentSearch={q}
				currentStatus={status}
				onSearch={(value) => setParams({ q: value, page: 1 })}
				onStatusChange={(value) =>
					setParams({ status: (value as WaitlistStatus) ?? null, page: 1 })
				}
			/>

			<AdminDataTable
				columns={columns}
				data={data?.items ?? []}
				isLoading={isFetching && !data}
			/>

			<AdminTablePagination
				total={data?.total ?? 0}
				page={page}
				pageSize={pageSize}
				pageCount={data?.pageCount ?? 1}
				onPageChange={(p) => setParams({ page: p })}
				onPageSizeChange={(size) => setParams({ pageSize: size, page: 1 })}
			/>

			<AdminWaitlistDetailSheet
				item={selectedItem}
				open={isSheetOpen}
				onOpenChange={setIsSheetOpen}
				onApprove={handleApprove}
				onReject={handleReject}
				isActionLoading={isActionLoading}
			/>
		</div>
	);
}
