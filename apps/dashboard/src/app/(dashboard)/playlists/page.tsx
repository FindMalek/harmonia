"use client";

import { DASHBOARD_ROUTES } from "@harmonia/common/utils/routes";
import { Icons } from "@harmonia/ui";
import { useEffect, useRef } from "react";
import {
	DashboardPlaylistsListRow,
	DashboardPlaylistsListSkeleton,
} from "@/components/app/dashboard-playlists-list-row";
import { DashboardPlaylistsPageHeader } from "@/components/app/dashboard-playlists-page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ScrollToTopButton } from "@/components/shared/scroll-to-top-button";
import { useDashboardScrollContainer } from "@/hooks/use-dashboard-scroll-container";
import { useScrollFlags } from "@/hooks/use-scroll-flags";
import { usePlaylistsController } from "@/shared/lib/playlists/controller.hook";

export default function PlaylistsPage() {
	const { list, search } = usePlaylistsController();
	const {
		data,
		isLoading,
		isError,
		error,
		refetch,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
	} = list;

	const scrollContainerRef = useDashboardScrollContainer();
	const { scrolled, showBackToTop } = useScrollFlags(scrollContainerRef, {
		collapseAt: 24,
		backToTopAt: 400,
	});

	const sentinelRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const sentinel = sentinelRef.current;
		const root = scrollContainerRef.current;
		if (!sentinel || !root) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
					fetchNextPage();
				}
			},
			{ root, rootMargin: "200px" },
		);
		observer.observe(sentinel);
		return () => observer.disconnect();
	}, [scrollContainerRef, hasNextPage, isFetchingNextPage, fetchNextPage]);

	const playlists = data?.pages.flatMap((page) => page.items) ?? [];

	if (isError) {
		return (
			<div className="space-y-8">
				<DashboardPlaylistsPageHeader
					hasPlaylists={false}
					scrolled={scrolled}
				/>
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
				<DashboardPlaylistsPageHeader
					hasPlaylists={false}
					scrolled={scrolled}
				/>
				<DashboardPlaylistsListSkeleton />
			</div>
		);
	}

	const hasAnyPlaylists = playlists.length > 0 || search.length > 0;

	return (
		<div className="space-y-8">
			<DashboardPlaylistsPageHeader
				hasPlaylists={hasAnyPlaylists}
				scrolled={scrolled}
			/>

			{playlists.length === 0 ? (
				search ? (
					<EmptyState
						icon={Icons.search}
						title="No matching playlists"
						description="Try a different search."
						variant="card"
					/>
				) : (
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
				)
			) : (
				<div className="divide-y divide-border">
					{playlists.map((pl) => (
						<DashboardPlaylistsListRow key={pl.id} playlist={pl} />
					))}
				</div>
			)}

			{hasNextPage ? <div ref={sentinelRef} className="h-1" /> : null}

			<ScrollToTopButton
				visible={showBackToTop}
				containerRef={scrollContainerRef}
			/>
		</div>
	);
}
