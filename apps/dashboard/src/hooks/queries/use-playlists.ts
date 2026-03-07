import { orpc } from "@/lib/orpc";
import { useQuery } from "@tanstack/react-query";

export function usePlaylists() {
	return useQuery(orpc.playlists.list.queryOptions({ input: {} }));
}

export function usePlaylistDetail(id: number | null) {
	return useQuery({
		...orpc.playlists.getById.queryOptions({ input: { id: id ?? 0 } }),
		enabled: id !== null,
	});
}
