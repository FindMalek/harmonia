"use client";

import { DASHBOARD_ROUTES } from "@harmonia/common/utils/routes";
import { Icons } from "@harmonia/ui";
import {
	DashboardPlaylistsListRow,
	DashboardPlaylistsListSkeleton,
} from "@/components/app/dashboard-playlists-list-row";
import { DashboardPlaylistsPageHeader } from "@/components/app/dashboard-playlists-page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { usePlaylistsController } from "@/shared/lib/playlists/controller.hook";

export default function PlaylistsPage() {
	const { list } = usePlaylistsController();
	const { data: playlists, isLoading, isError, error, refetch } = list;

	if (isError) {
		return (
			<div className="space-y-8">
				<DashboardPlaylistsPageHeader hasPlaylists={false} />
				<ErrorState
					message={
						error instanceof Error ? error.message : "Failed to load playlists"
					}
					onRetry={() => refetch()}
				/>
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className="space-y-8">
				<DashboardPlaylistsPageHeader hasPlaylists={false} />
				<DashboardPlaylistsListSkeleton />
			</div>
		);
	}

	return (
		<div className="space-y-8">
			<DashboardPlaylistsPageHeader hasPlaylists={Boolean(playlists?.length)} />

			{!playlists?.length ? (
				<EmptyState
					icon={Icons.disc}
					title="No playlists yet"
					description="Run the pipeline to generate playlists from your library."
					action={{
						label: "Run Pipeline",
						onClick: () => {
							window.location.href = DASHBOARD_ROUTES.overview.path;
						},
					}}
					variant="card"
				/>
			) : (
				<div className="divide-y divide-border">
					{playlists.map((pl) => (
						<DashboardPlaylistsListRow key={pl.id} playlist={pl} />
					))}
				</div>
			)}
		</div>
	);
}
