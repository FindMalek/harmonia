"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { toastError } from "@/shared/api/error-handler";
import { orpc } from "@/shared/api/orpc";
import { queryKeys } from "@/shared/api/query-keys";
import { usePlaylistsStore } from "./store";

export function usePlaylistsController(updateOnSuccess?: () => void) {
	const store = usePlaylistsStore();
	const queryClient = useQueryClient();

	const list = useQuery(orpc.playlists.list.queryOptions({ input: {} }));

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
