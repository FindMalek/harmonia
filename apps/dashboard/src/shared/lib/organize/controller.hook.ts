"use client";

import { authClient } from "@/shared/api/auth-client";
import { toastError } from "@/shared/api/error-handler";
import { orpc } from "@/shared/api/orpc";
import { queryKeys } from "@/shared/api/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useOrganizeStore } from "./store";

export function useOrganizeController() {
	const store = useOrganizeStore();
	const queryClient = useQueryClient();
	const router = useRouter();

	const organizeMutation = useMutation(
		orpc.organize.run.mutationOptions({
			onSuccess: (data) => {
				const first = data.results[0];
				if (first?.runId) {
					store.setActiveRunId(first.runId);
					store.setIsAnalysisDrawerOpen(true);
				}
				toast.success(
					first ? `Pipeline started (run #${first.runId})` : "Pipeline started",
				);
				queryClient.invalidateQueries({ queryKey: queryKeys.pipeline() });
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
									store.setActiveRunId(null);
									store.setIsAnalysisDrawerOpen(false);
									await authClient.signOut();
									router.push("/login");
								},
							},
						},
					);
				} else {
					toastError(msg);
				}
			},
		}),
	);

	const cancelMutation = useMutation(
		orpc.pipeline.cancel.mutationOptions({
			onSuccess: (data) => {
				if (data.cancelled) toast.success("Analysis cancelled");
				queryClient.invalidateQueries({ queryKey: queryKeys.pipeline() });
			},
			onError: (error) => {
				toast.error(error.message ?? "Failed to cancel analysis");
			},
		}),
	);

	const clearAnalysisMutation = useMutation(
		orpc.pipeline.clearAnalysis.mutationOptions({
			onSuccess: (data) => {
				toast.success(`Analysis cleared (${data.tracksUpdated} tracks reset)`);
				queryClient.invalidateQueries({ queryKey: queryKeys.pipeline() });
				queryClient.invalidateQueries({ queryKey: queryKeys.tracks() });
				queryClient.invalidateQueries({ queryKey: queryKeys.clusters() });
				queryClient.invalidateQueries({ queryKey: queryKeys.playlists() });
			},
			onError: (error) => {
				toastError(error.message ?? "Failed to clear analysis");
			},
		}),
	);

	return { ...store, organizeMutation, cancelMutation, clearAnalysisMutation };
}
