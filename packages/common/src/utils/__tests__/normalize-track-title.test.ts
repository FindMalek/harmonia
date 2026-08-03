import { describe, expect, it } from "vitest";

import {
	normalizeTrackTitle,
	selectCanonicalTracks,
} from "../normalize-track-title";

describe("normalizeTrackTitle", () => {
	it("strips a Deluxe Edition suffix", () => {
		expect(normalizeTrackTitle("The Unforgiven (Deluxe Edition)")).toBe(
			"The Unforgiven",
		);
	});

	it("strips a bare Deluxe suffix", () => {
		expect(normalizeTrackTitle("Song (Deluxe)")).toBe("Song");
	});

	it("strips a Remastered suffix with a year", () => {
		expect(normalizeTrackTitle("Song (Remastered 2009)")).toBe("Song");
	});

	it("strips a year-prefixed Remaster suffix", () => {
		expect(normalizeTrackTitle("Song (2009 Remaster)")).toBe("Song");
	});

	it("strips a Radio Edit suffix in brackets", () => {
		expect(normalizeTrackTitle("Song [Radio Edit]")).toBe("Song");
	});

	it("strips an Explicit tag", () => {
		expect(normalizeTrackTitle("Song (Explicit)")).toBe("Song");
	});

	it("leaves a title with no parenthetical unchanged", () => {
		expect(normalizeTrackTitle("Live and Let Die")).toBe("Live and Let Die");
	});

	it("keeps a Live recording tag (different recording, not a re-release)", () => {
		expect(normalizeTrackTitle("Hurt (Live at MSG 2007)")).toBe(
			"Hurt (Live at MSG 2007)",
		);
	});

	it("keeps a feat. credit", () => {
		expect(normalizeTrackTitle("Song (feat. Someone)")).toBe(
			"Song (feat. Someone)",
		);
	});

	it("keeps an Acoustic tag", () => {
		expect(normalizeTrackTitle("Song (Acoustic)")).toBe("Song (Acoustic)");
	});

	it("keeps an Instrumental tag", () => {
		expect(normalizeTrackTitle("Song (Instrumental)")).toBe(
			"Song (Instrumental)",
		);
	});
});

describe("selectCanonicalTracks", () => {
	it("keeps the plain version over a Deluxe Edition duplicate", () => {
		const result = selectCanonicalTracks([
			{
				id: "b",
				name: "The Unforgiven (Deluxe Edition)",
				primaryArtist: "Metallica",
			},
			{ id: "a", name: "The Unforgiven", primaryArtist: "Metallica" },
		]);
		expect(result).toEqual([
			{ id: "a", name: "The Unforgiven", primaryArtist: "Metallica" },
		]);
	});

	it("keeps both a Live version and the studio version", () => {
		const tracks = [
			{ id: "a", name: "Hurt", primaryArtist: "Johnny Cash" },
			{
				id: "b",
				name: "Hurt (Live at MSG 2007)",
				primaryArtist: "Johnny Cash",
			},
		];
		const result = selectCanonicalTracks(tracks);
		expect(result).toHaveLength(2);
	});

	it("keeps tracks with different primary artists separate even with the same title", () => {
		const tracks = [
			{ id: "a", name: "Home", primaryArtist: "Artist One" },
			{ id: "b", name: "Home", primaryArtist: "Artist Two" },
		];
		expect(selectCanonicalTracks(tracks)).toHaveLength(2);
	});

	it("breaks a same-length-name tie by the lexicographically smaller ID", () => {
		const result = selectCanonicalTracks([
			{ id: "z", name: "Song", primaryArtist: "Artist" },
			{ id: "a", name: "Song", primaryArtist: "Artist" },
		]);
		expect(result).toEqual([
			{ id: "a", name: "Song", primaryArtist: "Artist" },
		]);
	});

	it("passes a user with only the deluxe version through unchanged", () => {
		const tracks = [
			{ id: "a", name: "Song (Deluxe Edition)", primaryArtist: "Artist" },
		];
		expect(selectCanonicalTracks(tracks)).toEqual(tracks);
	});
});
