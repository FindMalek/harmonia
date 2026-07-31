"use client";

import {
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { useDeferredValue } from "react";
import { toast } from "sonner";
import { toastError } from "@/shared/api/error-handler";
import { orpc } from "@/shared/api/orpc";
import { queryKeys } from "@/shared/api/query-keys";
import { usePlaylistsStore } from "./store";

const PLAYLISTS_PAGE_SIZE = 20;
const PLAYLIST_TRACKS_PAGE_SIZE = 50;

export function usePlaylistsController(updateOnSuccess?: () => void) {
	const store = usePlaylistsStore();
	const queryClient = useQueryClient();

	const list = useInfiniteQuery(
		orpc.playlists.list.infiniteOptions({
			input: (cursor: number | null) => ({
				cursor,
				limit: PLAYLISTS_PAGE_SIZE,
			}),
			initialPageParam: null,
			getNextPageParam: (lastPage) => lastPage.nextCursor,
		}),
	);

	const detail = useQuery({
		...orpc.playlists.getById.queryOptions({
			input: { id: store.selectedPlaylistId ?? 0 },
		}),
		enabled: store.selectedPlaylistId !== null,
	});

	const exportMutation = useMutation(
		orpc.playlists.export.mutationOptions({
			onSuccess: (data) => {
				if (data) {
					toast.success("Playlist exported to Spotify!");
				} else {
					toast.error("Failed to export playlist");
				}
				queryClient.invalidateQueries({ queryKey: queryKeys.playlists() });
			},
			onError: (error) => {
				toastError(error.message ?? "Export failed");
			},
		}),
	);

	const exportAllMutation = useMutation(
		orpc.playlists.exportAll.mutationOptions({
			onSuccess: (data) => {
				toast.success(
					`Exported ${data.exported} playlists${data.failed > 0 ? ` (${data.failed} failed)` : ""}`,
				);
				queryClient.invalidateQueries({ queryKey: queryKeys.playlists() });
			},
			onError: (error) => {
				toastError(error.message ?? "Export failed");
			},
		}),
	);

	const updateMutation = useMutation(
		orpc.playlists.update.mutationOptions({
			onSuccess: () => {
				toast.success("Playlist updated");
				queryClient.invalidateQueries({ queryKey: queryKeys.playlists() });
				updateOnSuccess?.();
			},
			onError: (error) => {
				toastError(error.message ?? "Update failed");
			},
		}),
	);

	return {
		...store,
		list,
		detail,
		exportMutation,
		exportAllMutation,
		updateMutation,
	};
}

export function usePlaylistTracksController(playlistId: number) {
	const store = usePlaylistsStore();
	const deferredSearch = useDeferredValue(store.trackSearch.trim());

	const tracks = useInfiniteQuery({
		...orpc.playlists.getTracks.infiniteOptions({
			input: (cursor: number | null) => ({
				playlistId,
				cursor,
				limit: PLAYLIST_TRACKS_PAGE_SIZE,
				search: deferredSearch || undefined,
			}),
			initialPageParam: null,
			getNextPageParam: (lastPage) => lastPage.nextCursor,
		}),
		enabled: playlistId > 0,
	});

	return {
		tracks,
		trackSearch: store.trackSearch,
		setTrackSearch: store.setTrackSearch,
	};
}
