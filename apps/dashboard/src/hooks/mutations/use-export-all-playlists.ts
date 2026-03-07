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

export function useExportAllPlaylists() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.playlists.exportAll.mutationOptions({
			onSuccess: (data) => {
				toast.success(
					`Exported ${data.exported} playlists${data.failed > 0 ? ` (${data.failed} failed)` : ""}`,
				);
				queryClient.invalidateQueries({ queryKey: queryKeys.playlists() });
			},
			onError: (error) => {
				toastErrorWithCopy(error.message ?? "Export failed");
			},
		}),
	);
}
