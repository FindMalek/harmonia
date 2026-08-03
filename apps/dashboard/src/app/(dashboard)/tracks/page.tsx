"use client";

import { Icons } from "@harmonia/ui";
import { Fragment } from "react";
import {
	DashboardTracksListRow,
	DashboardTracksListSkeleton,
} from "@/components/app/dashboard-tracks-list-row";
import { DashboardTracksPageHeader } from "@/components/app/dashboard-tracks-page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ScrollToTopButton } from "@/components/shared/scroll-to-top-button";
import { useDashboardScrollContainer } from "@/hooks/use-dashboard-scroll-container";
import { useInfiniteScrollSentinel } from "@/hooks/use-infinite-scroll-sentinel";
import { useScrollFlags } from "@/hooks/use-scroll-flags";
import { useTracksController } from "@/shared/lib/tracks/controller.hook";

export default function TracksPage() {
	const { list, search, setSearch, sort, setSort } = useTracksController();
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
	const { showBackToTop, scrollDirection } = useScrollFlags(
		scrollContainerRef,
		{ collapseAt: 24, backToTopAt: 400 },
	);

	const sentinelRef = useInfiniteScrollSentinel({
		rootRef: scrollContainerRef,
		hasNextPage: Boolean(hasNextPage),
		isFetchingNextPage,
		fetchNextPage,
	});

	const tracks = data?.pages.flatMap((page) => page.tracks) ?? [];

	// Backend returns album-sorted rows contiguously when sort === "album", so
	// a plain consecutive scan is enough to find group boundaries — no need to
	// re-sort or bucket client-side.
	const albumGroupStartIds =
		sort === "album"
			? new Set(
					tracks
						.filter(
							(t, i) =>
								i === 0 ||
								(t.albumId ?? t.albumName) !==
									(tracks[i - 1]?.albumId ?? tracks[i - 1]?.albumName),
						)
						.map((t) => t.id),
				)
			: null;

	if (isError) {
		return (
			<div className="space-y-8">
				<DashboardTracksPageHeader
					search={search}
					onSearchChange={setSearch}
					sort={sort}
					onSortChange={setSort}
				/>
				<ErrorState
					message={
						error instanceof Error ? error.message : "Failed to load tracks"
					}
					onRetry={() => refetch()}
				/>
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className="space-y-8">
				<DashboardTracksPageHeader
					search={search}
					onSearchChange={setSearch}
					sort={sort}
					onSortChange={setSort}
				/>
				<DashboardTracksListSkeleton />
			</div>
		);
	}

	return (
		<div className="space-y-8">
			<DashboardTracksPageHeader
				search={search}
				onSearchChange={setSearch}
				sort={sort}
				onSortChange={setSort}
			/>

			{tracks.length === 0 ? (
				<EmptyState
					icon={Icons.music}
					title={search ? "No matching tracks" : "No tracks yet"}
					description={
						search
							? "Try a different search."
							: "Sync your Spotify library to see tracks here."
					}
					variant="card"
				/>
			) : (
				<div>
					{tracks.map((t) => (
						<Fragment key={t.id}>
							{albumGroupStartIds?.has(t.id) ? (
								<p className="pt-4 pb-1 font-mono text-[9px] text-muted-foreground uppercase tracking-widest">
									{t.albumName ?? "Unknown album"}
								</p>
							) : null}
							<DashboardTracksListRow track={t} />
						</Fragment>
					))}
				</div>
			)}

			{hasNextPage ? <div ref={sentinelRef} className="h-1" /> : null}

			<ScrollToTopButton
				visible={showBackToTop}
				scrollDirection={scrollDirection}
				containerRef={scrollContainerRef}
			/>
		</div>
	);
}
