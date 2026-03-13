import { orpc } from "@/lib/orpc";
import { useQuery } from "@tanstack/react-query";

export function useLibraryStats(options?: {
	enabled?: boolean;
	refetchInterval?: number | false;
}) {
	const { enabled = true, refetchInterval = false } = options ?? {};

	return useQuery({
		...orpc.spotify.libraryStats.queryOptions({ input: {} }),
		enabled,
		refetchInterval,
		refetchIntervalInBackground: false,
	});
}
