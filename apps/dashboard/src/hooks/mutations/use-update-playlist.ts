import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
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

export function useUpdatePlaylist(onSuccess?: () => void) {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.playlists.update.mutationOptions({
			onSuccess: () => {
				toast.success("Playlist updated");
				queryClient.invalidateQueries({ queryKey: queryKeys.playlists() });
				onSuccess?.();
			},
			onError: (error) => {
				toastErrorWithCopy(error.message ?? "Update failed");
			},
		}),
	);
}
