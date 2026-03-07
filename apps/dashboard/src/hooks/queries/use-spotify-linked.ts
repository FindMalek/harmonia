import { orpc } from "@/lib/orpc";
import { useQuery } from "@tanstack/react-query";

export function useSpotifyLinked() {
	return useQuery(orpc.hasSpotifyLinked.queryOptions());
}
