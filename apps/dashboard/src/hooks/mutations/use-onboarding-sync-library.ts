import { orpc } from "@/shared/api/orpc";
import { queryKeys } from "@/shared/api/query-keys";
import { useOnboardingStore } from "@/shared/lib/onboarding/store";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useOnboardingStoreLibrary() {
	const queryClient = useQueryClient();
	const setComplete = useOnboardingStore((state) => state.setComplete);
	const setSyncing = useOnboardingStore((state) => state.setSyncing);

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
