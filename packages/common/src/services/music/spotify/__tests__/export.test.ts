import { afterEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => {
	function chain(result: unknown) {
		const c: Record<string, unknown> = {};
		c.from = vi.fn(() => c);
		c.innerJoin = vi.fn(() => c);
		c.where = vi.fn(() => c);
		c.orderBy = vi.fn(() => c);
		// biome-ignore lint/suspicious/noThenProperty: intentional thenable, faking drizzle's awaitable chained query builder
		c.then = (
			resolve: (v: unknown) => unknown,
			reject?: (e: unknown) => unknown,
		) => Promise.resolve(result).then(resolve, reject);
		return c;
	}

	const selectMock = vi.fn();
	const updateSetMock = vi.fn(() => ({
		where: vi.fn(() => Promise.resolve()),
	}));
	const updateMock = vi.fn(() => ({ set: updateSetMock }));

	return { chain, selectMock, updateMock, updateSetMock };
});

vi.mock("@harmonia/db", () => ({
	db: {
		select: dbMock.selectMock,
		update: dbMock.updateMock,
	},
}));

vi.mock("../client", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../client")>();
	return {
		...actual,
		getUserSpotifyAccessToken: vi.fn(async () => "test-token"),
		spotifyRequest: vi.fn(),
	};
});

import { SpotifyApiError, spotifyRequest } from "../client";
import { exportPlaylistToSpotify } from "../export";

describe("exportPlaylistToSpotify", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("recreates the playlist when the existing Spotify playlist was deleted (404), without retrying the dead playlist", async () => {
		const playlistRow = {
			id: 1,
			userId: "user-1",
			name: "Test Playlist",
			description: "desc",
			spotifyPlaylistId: "old-spotify-id",
		};
		const trackRows = [{ spotifyUri: "spotify:track:abc" }];

		dbMock.selectMock
			.mockReturnValueOnce(dbMock.chain([playlistRow]))
			.mockReturnValueOnce(dbMock.chain(trackRows));

		const mockedSpotifyRequest = vi.mocked(spotifyRequest);
		mockedSpotifyRequest.mockImplementation(async (path: string) => {
			if (path === "/playlists/old-spotify-id") {
				throw new SpotifyApiError(
					404,
					"Spotify API error 404 for /playlists/old-spotify-id: Not found",
				);
			}
			if (path === "/me/playlists") {
				return {
					id: "new-spotify-id",
					external_urls: {
						spotify: "https://open.spotify.com/playlist/new-spotify-id",
					},
				};
			}
			return undefined;
		});

		const result = await exportPlaylistToSpotify("user-1", 1);

		expect(result).toEqual({
			spotifyPlaylistId: "new-spotify-id",
			spotifyUrl: "https://open.spotify.com/playlist/new-spotify-id",
		});

		// The failing request against the deleted playlist must not have been
		// retried — exactly 1 call for that path proves the 404 aborted p-retry
		// immediately instead of burning retries on a non-transient error.
		const deletedPlaylistCalls = mockedSpotifyRequest.mock.calls.filter(
			([path]) => path === "/playlists/old-spotify-id",
		);
		expect(deletedPlaylistCalls).toHaveLength(1);

		// The new playlist ID is what gets persisted, not the stale one.
		expect(dbMock.updateSetMock).toHaveBeenCalledWith(
			expect.objectContaining({ spotifyPlaylistId: "new-spotify-id" }),
		);
	});
});
