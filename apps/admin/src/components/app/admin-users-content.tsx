"use client";

import type { AdminUserItem } from "@sonaraem/common/schemas";
import { Badge } from "@sonaraem/ui";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";

import { orpc } from "@/shared/api/orpc";
import { AdminDataTable } from "./admin-data-table";
import { AdminTablePagination } from "./admin-table-pagination";
import { AdminTableToolbar } from "./admin-table-toolbar";

const USERS_PARAMS = {
	page: parseAsInteger.withDefault(1),
	pageSize: parseAsInteger.withDefault(25),
	q: parseAsString.withDefault(""),
};

const columns: ColumnDef<AdminUserItem>[] = [
	{ accessorKey: "name", header: "Name" },
	{ accessorKey: "email", header: "Email" },
	{
		accessorKey: "role",
		header: "Role",
		cell: ({ row }) =>
			row.original.role ? (
				<Badge variant="secondary">{row.original.role}</Badge>
			) : (
				<span className="text-muted-foreground text-sm">user</span>
			),
	},
	{
		accessorKey: "isApproved",
		header: "Approved",
		cell: ({ row }) =>
			row.original.isApproved ? (
				<Badge variant="default">Yes</Badge>
			) : (
				<Badge variant="secondary">No</Badge>
			),
	},
	{
		accessorKey: "banned",
		header: "Banned",
		cell: ({ row }) =>
			row.original.banned ? (
				<Badge variant="destructive">Yes</Badge>
			) : (
				<span className="text-muted-foreground text-sm">—</span>
			),
	},
	{
		accessorKey: "createdAt",
		header: "Joined",
		cell: ({ row }) => format(new Date(row.original.createdAt), "d MMM yyyy"),
	},
];

export function AdminUsersContent() {
	const [params, setParams] = useQueryStates(USERS_PARAMS, {
		shallow: false,
		startTransition: undefined,
	});

	const { data, isFetching } = useQuery(
		orpc.admin.users.list.queryOptions({
			input: {
				page: params.page,
				pageSize: params.pageSize,
				q: params.q || undefined,
			},
		}),
	);

	return (
		<div className="space-y-4">
			<AdminTableToolbar
				searchPlaceholder="Search by name or email…"
				currentSearch={params.q}
				currentStatus={undefined}
				onSearch={(value) => setParams({ q: value, page: 1 })}
				onStatusChange={() => null}
			/>

			<AdminDataTable
				columns={columns}
				data={data?.items ?? []}
				isLoading={isFetching && !data}
			/>

			<AdminTablePagination
				total={data?.total ?? 0}
				page={params.page}
				pageSize={params.pageSize}
				pageCount={data?.pageCount ?? 1}
				onPageChange={(p) => setParams({ page: p })}
				onPageSizeChange={(size) => setParams({ pageSize: size, page: 1 })}
			/>
		</div>
	);
}
