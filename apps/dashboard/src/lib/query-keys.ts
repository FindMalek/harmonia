import { orpc } from "./orpc";

/**
 * Centralized query keys for TanStack Query invalidation.
 * Use with queryClient.invalidateQueries({ queryKey: queryKeys.playlists() })
 */
export const queryKeys = {
	clusters: () => orpc.clusters.key(),
	playlists: () => orpc.playlists.key(),
	tracks: () => orpc.tracks.key(),
	pipeline: () => orpc.pipeline.key(),
	todo: () => orpc.todo.key(),
	todoList: () => orpc.todo.getAll.key(),
	hasSpotifyLinked: () => orpc.hasSpotifyLinked.key(),
} as const;
