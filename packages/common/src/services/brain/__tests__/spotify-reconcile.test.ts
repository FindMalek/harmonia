import { describe, expect, it } from "vitest";

import { diffManualSpotifyEdits } from "../spotify-reconcile";

describe("diffManualSpotifyEdits", () => {
	it("returns no changes when both sets match", () => {
		const ids = new Set(["a", "b", "c"]);
		expect(diffManualSpotifyEdits(ids, ids)).toEqual({
			added: [],
			removed: [],
		});
	});

	it("detects a manually removed track", () => {
		const sonaraem = new Set(["a", "b", "c"]);
		const live = new Set(["a", "c"]);
		expect(diffManualSpotifyEdits(sonaraem, live)).toEqual({
			added: [],
			removed: ["b"],
		});
	});

	it("detects a manually added track", () => {
		const sonaraem = new Set(["a", "b"]);
		const live = new Set(["a", "b", "d"]);
		expect(diffManualSpotifyEdits(sonaraem, live)).toEqual({
			added: ["d"],
			removed: [],
		});
	});

	it("detects both an addition and a removal at once", () => {
		const sonaraem = new Set(["a", "b"]);
		const live = new Set(["a", "d"]);
		expect(diffManualSpotifyEdits(sonaraem, live)).toEqual({
			added: ["d"],
			removed: ["b"],
		});
	});

	it("treats an empty live playlist as removing every Sonaraem track", () => {
		const sonaraem = new Set(["a", "b"]);
		const live = new Set<string>();
		expect(diffManualSpotifyEdits(sonaraem, live)).toEqual({
			added: [],
			removed: ["a", "b"],
		});
	});
});
