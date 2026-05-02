"use client";

import {
	DashboardPlaylistDetail,
	DashboardPlaylistDetailNotFound,
	DashboardPlaylistDetailSkeleton,
} from "@/components/app/dashboard-playlist-detail";
import { useExportPlaylist } from "@/hooks/mutations/use-export-playlist";
import { usePlaylistDetail } from "@/hooks/queries/use-playlists";
import { use } from "react";

export default function PlaylistDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	const playlistId = Number(id);

	const { data: playlist, isLoading, isError } = usePlaylistDetail(playlistId);
	const exportMutation = useExportPlaylist();

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
