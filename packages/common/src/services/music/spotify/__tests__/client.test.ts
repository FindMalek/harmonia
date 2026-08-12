import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@harmonia/db", () => ({
	db: { insert: vi.fn(() => ({ values: vi.fn(() => Promise.resolve()) })) },
}));

import { isDeadTokenError, SpotifyApiError, spotifyRequest } from "../client";

function mockFetchOnce(response: {
	status: number;
	body?: string;
	headers?: Record<string, string>;
}): void {
	vi.stubGlobal(
		"fetch",
		vi.fn().mockResolvedValue(
			new Response(response.body ?? null, {
				status: response.status,
				headers: response.headers,
			}),
		),
	);
}

describe("spotifyRequest", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("returns undefined for a 204 No Content response instead of throwing", async () => {
		mockFetchOnce({ status: 204 });
		await expect(
			spotifyRequest("/playlists/abc", "token", { method: "PUT" }),
		).resolves.toBeUndefined();
	});

	it("returns undefined for a 200 response with an empty body", async () => {
		mockFetchOnce({ status: 200, body: "" });
		await expect(
			spotifyRequest("/playlists/abc", "token", { method: "PUT" }),
		).resolves.toBeUndefined();
	});

	it("parses a normal JSON body", async () => {
		mockFetchOnce({
			status: 200,
			body: JSON.stringify({ snapshot_id: "xyz" }),
		});
		await expect(
			spotifyRequest("/playlists/abc/tracks", "token", { method: "PUT" }),
		).resolves.toEqual({ snapshot_id: "xyz" });
	});

	it("throws a SpotifyApiError carrying the status on a 404", async () => {
		mockFetchOnce({
			status: 404,
			body: JSON.stringify({ error: { message: "Not found" } }),
		});
		const result = spotifyRequest("/playlists/deleted", "token");
		await expect(result).rejects.toThrow(SpotifyApiError);
		await expect(result).rejects.toMatchObject({ status: 404 });
	});
});

describe("isDeadTokenError", () => {
	it("recognizes invalid_grant as a dead token", () => {
		expect(isDeadTokenError({ error: "invalid_grant" })).toBe(true);
	});

	it("does not flag other OAuth errors as dead tokens", () => {
		expect(isDeadTokenError({ error: "invalid_client" })).toBe(false);
	});

	it("does not flag a transient/unparseable body as a dead token", () => {
		expect(isDeadTokenError(undefined)).toBe(false);
		expect(isDeadTokenError(null)).toBe(false);
		expect(isDeadTokenError("rate limited")).toBe(false);
		expect(isDeadTokenError({})).toBe(false);
	});
});
