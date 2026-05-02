import { orpc } from "@/shared/api/orpc";
import { queryKeys } from "@/shared/api/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

function toastErrorWithCopy(msg: string) {
	toast.error(msg, {
		action: {
			label: "Copy",
			onClick: async () => {
				try {
					await navigator.clipboard.writeText(msg);
					toast.success("Copied");
				} catch {
					toast.error("Failed to copy");
				}
			},
		},
	});
}

export function useExportPlaylist() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.playlists.export.mutationOptions({
			onSuccess: (data) => {
				if (data) {
					toast.success("Playlist exported to Spotify!");
					queryClient.invalidateQueries({ queryKey: queryKeys.playlists() });
				} else {
					toast.error("Failed to export playlist");
				}
			},
			onError: (error) => {
				toastErrorWithCopy(error.message ?? "Export failed");
			},
		}),
	);
}
