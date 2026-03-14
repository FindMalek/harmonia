import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useOnboardingSync } from "@/stores/onboarding-sync";

export function useOnboardingSyncLibrary() {
	const queryClient = useQueryClient();
	const setComplete = useOnboardingSync((state) => state.setComplete);
	const setSyncing = useOnboardingSync((state) => state.setSyncing);

	return useMutation(
		orpc.spotify.syncLibrary.mutationOptions({
			onSuccess: () => {
				setComplete(true);
				setSyncing(false);
				void queryClient.invalidateQueries({
					queryKey: queryKeys.spotifyLibraryStats(),
				});
			},
			onError: (error: Error) => {
				console.error("Sync failed", error);
				setSyncing(false);
			},
		}),
	);
}
