import { describe, expect, it, vi } from "vitest";

vi.mock("@harmonia/db", () => ({
	db: { insert: vi.fn(() => ({ values: vi.fn(() => Promise.resolve()) })) },
}));

import { findArtistMatch, parseKeyOf } from "../getsongbpm-client";

describe("findArtistMatch", () => {
	it("matches an artist name exactly, case/whitespace-insensitively", () => {
		const results = [
			{ id: "1", artist: { name: "  The Beatles  " } },
			{ id: "2", artist: { name: "Radiohead" } },
		];
		expect(findArtistMatch(results, "the beatles")?.id).toBe("1");
	});

	it("returns null instead of guessing when no artist matches — a common", () => {
		// title search returning only unrelated artists must not silently
		// attach a wrong song's audio features to this track.
		const results = [
			{ id: "1", artist: { name: "Some Cover Band" } },
			{ id: "2", artist: { name: "Another Artist" } },
		];
		expect(findArtistMatch(results, "The Beatles")).toBeNull();
	});

	it("returns null for an empty result set", () => {
		expect(findArtistMatch([], "The Beatles")).toBeNull();
	});

	it("returns null when a result has no artist name at all", () => {
		expect(findArtistMatch([{ id: "1" }], "The Beatles")).toBeNull();
	});
});

describe("parseKeyOf", () => {
	it("parses a major key letter", () => {
		expect(parseKeyOf("C")).toEqual({ key: 0, mode: 1 });
	});

	it("parses a minor key (trailing m)", () => {
		expect(parseKeyOf("Em")).toEqual({ key: 4, mode: 0 });
	});

	it("parses sharps and flats to the same pitch class", () => {
		expect(parseKeyOf("C#")?.key).toBe(1);
		expect(parseKeyOf("Db")?.key).toBe(1);
	});

	it("returns nulls for undefined input", () => {
		expect(parseKeyOf(undefined)).toEqual({ key: null, mode: null });
	});

	it("returns nulls for an unrecognized letter", () => {
		expect(parseKeyOf("H")).toEqual({ key: null, mode: null });
	});
});
