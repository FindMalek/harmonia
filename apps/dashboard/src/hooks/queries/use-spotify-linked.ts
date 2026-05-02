import { orpc } from "@/shared/api/orpc";
import { useQuery } from "@tanstack/react-query";

export function useSpotifyLinked() {
	return useQuery(orpc.hasSpotifyLinked.queryOptions());
}
