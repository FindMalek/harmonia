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

export function useClearAnalysis() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.pipeline.clearAnalysis.mutationOptions({
			onSuccess: (data) => {
				toast.success(`Analysis cleared (${data.tracksUpdated} tracks reset)`);
				queryClient.invalidateQueries({ queryKey: queryKeys.pipeline() });
				queryClient.invalidateQueries({ queryKey: queryKeys.tracks() });
				queryClient.invalidateQueries({ queryKey: queryKeys.clusters() });
				queryClient.invalidateQueries({ queryKey: queryKeys.playlists() });
			},
			onError: (error) => {
				toastErrorWithCopy(error.message ?? "Failed to clear analysis");
			},
		}),
	);
}
