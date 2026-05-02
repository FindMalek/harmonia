"use client";

import {
	DashboardPlaylistDetail,
	DashboardPlaylistDetailNotFound,
	DashboardPlaylistDetailSkeleton,
} from "@/components/app/dashboard-playlist-detail";
import { usePlaylistsController } from "@/shared/lib/playlists/controller.hook";
import { use, useEffect } from "react";

export default function PlaylistDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	const playlistId = Number(id);

	const { setSelectedPlaylist, detail, exportMutation } =
		usePlaylistsController();

	useEffect(() => {
		setSelectedPlaylist(playlistId);
		return () => setSelectedPlaylist(null);
	}, [playlistId, setSelectedPlaylist]);

	const { data: playlist, isLoading, isError } = detail;

	if (isLoading) {
		return <DashboardPlaylistDetailSkeleton />;
	}

	if (isError || !playlist) {
		return <DashboardPlaylistDetailNotFound />;
	}

	return (
		<DashboardPlaylistDetail
			playlist={playlist}
			exportPending={exportMutation.isPending}
			onExport={() => exportMutation.mutate({ id: playlist.id })}
		/>
	);
}
