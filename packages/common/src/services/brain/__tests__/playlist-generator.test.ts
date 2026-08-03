import { describe, expect, it, vi } from "vitest";

vi.mock("@harmonia/db", () => ({ db: {} }));

import { findPrunableOrphanedPlaylists } from "../playlist-generator";

describe("findPrunableOrphanedPlaylists", () => {
	it("returns no prunable playlists when every playlist is matched", () => {
		const result = findPrunableOrphanedPlaylists(
			[
				{ id: 1, spotifyPlaylistId: null },
				{ id: 2, spotifyPlaylistId: "spotify-2" },
			],
			new Set([1, 2]),
		);
		expect(result).toEqual({ prunable: [], exportedOrphanCount: 0 });
	});

	it("prunes an orphaned playlist that was never exported", () => {
		const result = findPrunableOrphanedPlaylists(
			[
				{ id: 1, spotifyPlaylistId: null },
				{ id: 2, spotifyPlaylistId: "spotify-2" },
			],
			new Set([2]),
		);
		expect(result).toEqual({ prunable: [1], exportedOrphanCount: 0 });
	});

	it("leaves an orphaned but already-exported playlist alone, counted separately", () => {
		const result = findPrunableOrphanedPlaylists(
			[
				{ id: 1, spotifyPlaylistId: "spotify-1" },
				{ id: 2, spotifyPlaylistId: null },
			],
			new Set([]),
		);
		expect(result).toEqual({ prunable: [2], exportedOrphanCount: 1 });
	});

	it("prunes multiple never-exported orphans at once", () => {
		const result = findPrunableOrphanedPlaylists(
			[
				{ id: 1, spotifyPlaylistId: null },
				{ id: 2, spotifyPlaylistId: null },
				{ id: 3, spotifyPlaylistId: null },
			],
			new Set([]),
		);
		expect(result.prunable.sort()).toEqual([1, 2, 3]);
		expect(result.exportedOrphanCount).toBe(0);
	});
});
