import { describe, expect, it, vi } from "vitest";

vi.mock("@harmonia/db", () => ({ db: {} }));

import {
	dedupeTracksBySongIdentity,
	findPrunableOrphanedPlaylists,
} from "../playlist-generator";

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

describe("dedupeTracksBySongIdentity", () => {
	function track(id: string, name: string, artistNames: string[] = ["Artist"]) {
		return {
			id,
			name,
			artistNames: JSON.stringify(artistNames),
			llmMood: null,
			llmTags: null,
		};
	}

	it("keeps one copy of an exact duplicate (same name, same artist)", () => {
		const result = dedupeTracksBySongIdentity([
			track("b", "Song"),
			track("a", "Song"),
		]);
		expect(result).toEqual([track("a", "Song")]);
	});

	it("collapses a version-variant pair that slipped past sync-time dedup (#130)", () => {
		const result = dedupeTracksBySongIdentity([
			track("b", "Song (Deluxe Edition)"),
			track("a", "Song"),
		]);
		expect(result.map((t) => t.id)).toEqual(["a"]);
	});

	it("keeps a Live version distinct from the studio version", () => {
		const result = dedupeTracksBySongIdentity([
			track("a", "Hurt"),
			track("b", "Hurt (Live at MSG 2007)"),
		]);
		expect(result).toHaveLength(2);
	});

	it("keeps the same title by different artists distinct", () => {
		const result = dedupeTracksBySongIdentity([
			track("a", "Home", ["Artist One"]),
			track("b", "Home", ["Artist Two"]),
		]);
		expect(result).toHaveLength(2);
	});

	it("is a no-op when nothing collides", () => {
		const tracks = [track("a", "Song A"), track("b", "Song B")];
		expect(dedupeTracksBySongIdentity(tracks)).toEqual(tracks);
	});
});
