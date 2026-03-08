import { orpc } from "@/lib/orpc";
import { useQuery } from "@tanstack/react-query";

const STALE_TIME_MS = 5 * 60 * 1000; // 5 minutes

export function useSpotifyLibraryStats() {
	return useQuery({
		...orpc.spotify.libraryStats.queryOptions({ input: {} }),
		staleTime: STALE_TIME_MS,
	});
}
