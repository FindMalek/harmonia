"use client";

import { use, useEffect } from "react";
import {
	DashboardPlaylistDetail,
	DashboardPlaylistDetailNotFound,
	DashboardPlaylistDetailSkeleton,
} from "@/components/app/dashboard-playlist-detail";
import { ScrollToTopButton } from "@/components/shared/scroll-to-top-button";
import { useDashboardScrollContainer } from "@/hooks/use-dashboard-scroll-container";
import { useInfiniteScrollSentinel } from "@/hooks/use-infinite-scroll-sentinel";
import { useScrollFlags } from "@/hooks/use-scroll-flags";
import {
	usePlaylistsController,
	usePlaylistTracksController,
} from "@/shared/lib/playlists/controller.hook";

export default function PlaylistDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	const playlistId = Number(id);

	const { setSelectedPlaylist, detail, exportMutation, updateMutation } =
		usePlaylistsController();
	const { tracks, trackSearch, setTrackSearch, trackSort, setTrackSort } =
		usePlaylistTracksController(playlistId);

	useEffect(() => {
		setSelectedPlaylist(playlistId);
		return () => {
			setSelectedPlaylist(null);
			setTrackSearch("");
			setTrackSort("default");
		};
	}, [playlistId, setSelectedPlaylist, setTrackSearch, setTrackSort]);

	const scrollContainerRef = useDashboardScrollContainer();
	const { scrolled, showBackToTop, scrollDirection } = useScrollFlags(
		scrollContainerRef,
		{ collapseAt: 24, backToTopAt: 400 },
	);

	const {
		data,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		isLoading: tracksLoading,
	} = tracks;
	const tracksSentinelRef = useInfiniteScrollSentinel({
		rootRef: scrollContainerRef,
		hasNextPage,
		isFetchingNextPage,
		fetchNextPage,
	});
	const trackItems = data?.pages.flatMap((page) => page.items) ?? [];

	const { data: playlist, isLoading, isError } = detail;

	if (isLoading) {
		return <DashboardPlaylistDetailSkeleton />;
	}

	if (isError || !playlist) {
		return <DashboardPlaylistDetailNotFound />;
	}

	return (
		<>
			<DashboardPlaylistDetail
				playlist={playlist}
				exportPending={exportMutation.isPending}
				onExport={() => exportMutation.mutate({ id: playlist.id })}
				autoSyncPending={updateMutation.isPending}
				onToggleAutoSync={(checked) =>
					updateMutation.mutate({ id: playlist.id, autoSyncEnabled: checked })
				}
				tracks={trackItems}
				tracksLoading={tracksLoading}
				hasNextTracksPage={hasNextPage}
				tracksSentinelRef={tracksSentinelRef}
				scrolled={scrolled}
				trackSearch={trackSearch}
				onTrackSearchChange={setTrackSearch}
				trackSort={trackSort}
				onTrackSortChange={setTrackSort}
			/>
			<ScrollToTopButton
				visible={showBackToTop}
				scrollDirection={scrollDirection}
				containerRef={scrollContainerRef}
			/>
		</>
	);
}
