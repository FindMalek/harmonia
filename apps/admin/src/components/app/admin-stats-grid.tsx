"use client";

import { useQuery } from "@tanstack/react-query";

import { orpc } from "@/shared/api/orpc";
import { AdminStatCard, AdminStatCardSkeleton } from "./admin-stat-card";

export function AdminStatsGrid() {
	const { data } = useQuery(
		orpc.admin.stats.overview.queryOptions({ input: undefined }),
	);

	if (!data) {
		return <AdminStatsGridSkeleton />;
	}

	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			<AdminStatCard label="Total Users" value={data.totalUsers} />
			<AdminStatCard label="Total Tracks" value={data.totalTracks} />
			<AdminStatCard label="Waitlist Total" value={data.waitlistTotal} />
			<AdminStatCard label="Waitlist Pending" value={data.waitlistPending} />
			<AdminStatCard label="Waitlist Approved" value={data.waitlistApproved} />
			<AdminStatCard label="Waitlist Rejected" value={data.waitlistRejected} />
		</div>
	);
}

export function AdminStatsGridSkeleton() {
	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{Array.from({ length: 6 }).map((_, i) => (
				<AdminStatCardSkeleton key={i} />
			))}
		</div>
	);
}
