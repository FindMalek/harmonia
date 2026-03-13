import { DASHBOARD_ROUTES } from "@harmonia/common/utils/routes";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useOnboardingSync } from "@/stores/onboarding-sync";

export function useOnboardingSyncLibrary() {
	const queryClient = useQueryClient();
	const router = useRouter();
	const { setComplete, setSyncing } = useOnboardingSync();

	return useMutation(
		orpc.spotify.syncLibrary.mutationOptions({
			onSuccess: () => {
				setComplete(true);
				setSyncing(false);
				queryClient.invalidateQueries({
					queryKey: queryKeys.spotifyLibraryStats(),
				});
				router.refresh();
				setTimeout(() => router.push(DASHBOARD_ROUTES.overview.path), 1000);
			},
			onError: (error: Error) => {
				console.error("Sync failed", error);
				setSyncing(false);
				router.push(DASHBOARD_ROUTES.overview.path);
			},
		}),
	);
}
