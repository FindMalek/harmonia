import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
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

export function useOrganize() {
	const queryClient = useQueryClient();
	const router = useRouter();

	return useMutation(
		orpc.organize.run.mutationOptions({
			onSuccess: (data) => {
				const first = data.results[0];
				toast.success(
					first ? `Pipeline started (run #${first.runId})` : "Pipeline started",
				);
				queryClient.invalidateQueries({ queryKey: queryKeys.pipeline() });
				router.push("/dashboard/pipeline" as Parameters<typeof router.push>[0]);
			},
			onError: (error) => {
				const msg = error.message ?? "Failed to start pipeline";
				const isSpotify403 = msg.includes("403") && msg.includes("Spotify");
				if (isSpotify403) {
					toast.error(
						"Spotify 403: re-authorize by signing out and back in with Spotify.",
						{
							action: {
								label: "Reconnect",
								onClick: async () => {
									await authClient.signOut();
									router.push("/login");
								},
							},
						},
					);
				} else {
					toastErrorWithCopy(msg);
				}
			},
		}),
	);
}
