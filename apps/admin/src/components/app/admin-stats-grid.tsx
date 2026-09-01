"use client";

import { Button } from "@sonaraem/ui";
import { useQuery } from "@tanstack/react-query";

import { orpc } from "@/shared/api/orpc";
import { AdminStatCard, AdminStatCardSkeleton } from "./admin-stat-card";

export function AdminStatsGrid() {
	const { data, isError, refetch } = useQuery(
		orpc.admin.stats.overview.queryOptions({ input: undefined }),
	);

	if (!data) {
		if (isError) {
			return (
				<div className="rounded-md border p-8 text-center">
					<p className="text-muted-foreground text-sm">Failed to load stats</p>
					<Button
						variant="link"
						size="sm"
						className="mt-2"
						onClick={() => refetch()}
					>
						Retry
					</Button>
				</div>
			);
		}
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
			<AdminStatCard label="Pipeline Runs" value={data.totalPipelineRuns} />
			<AdminStatCard
				label="Pipeline Runs Completed"
				value={data.completedPipelineRuns}
			/>
			<AdminStatCard
				label="Playlists Generated"
				value={data.totalPlaylistsGenerated}
			/>
			<AdminStatCard
				label="Playlists Exported to Spotify"
				value={data.playlistsExportedToSpotify}
			/>
		</div>
	);
}

export function AdminStatsGridSkeleton() {
	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{Array.from({ length: 10 }).map((_, i) => (
				<AdminStatCardSkeleton key={i} />
			))}
		</div>
	);
}
