import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function useCancelPipeline() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.pipeline.cancel.mutationOptions({
			onSuccess: (data) => {
				if (data.cancelled) {
					toast.success("Analysis cancelled");
				}
				queryClient.invalidateQueries({ queryKey: queryKeys.pipeline() });
			},
			onError: (error) => {
				toast.error(error.message ?? "Failed to cancel analysis");
			},
		}),
	);
}
