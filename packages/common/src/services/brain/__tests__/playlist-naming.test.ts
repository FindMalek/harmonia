import { describe, expect, it } from "vitest";

import { normalizePlaylistName } from "../playlist-naming";

describe("normalizePlaylistName", () => {
	it("lowercases and trims", () => {
		expect(normalizePlaylistName("  Midnight Drift  ")).toBe("midnight drift");
	});

	it("strips common punctuation so near-identical names collide", () => {
		expect(normalizePlaylistName("Midnight Drift!")).toBe(
			normalizePlaylistName("midnight drift"),
		);
		expect(normalizePlaylistName("Don't Stop")).toBe(
			normalizePlaylistName("Dont Stop"),
		);
	});

	it("does not collide genuinely different names", () => {
		expect(normalizePlaylistName("Midnight Drift")).not.toBe(
			normalizePlaylistName("Sunday Morning"),
		);
	});
});
