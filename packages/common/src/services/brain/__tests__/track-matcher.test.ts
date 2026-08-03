import { describe, expect, it, vi } from "vitest";

vi.mock("@harmonia/db", () => ({ db: {} }));

import { pickBestPlaylistForTrack } from "../track-matcher";

describe("pickBestPlaylistForTrack", () => {
	it("picks the most similar playlist above the threshold", () => {
		const result = pickBestPlaylistForTrack(
			[1, 0],
			[
				{ id: 1, centroid: [0, 1], trackCount: 0 },
				{ id: 2, centroid: [1, 0], trackCount: 0 },
			],
			80,
			0.5,
		);
		expect(result).toBe(2);
	});

	it("returns null when nothing clears the similarity threshold", () => {
		const result = pickBestPlaylistForTrack(
			[1, 0],
			[{ id: 1, centroid: [0, 1], trackCount: 0 }],
			80,
			0.5,
		);
		expect(result).toBeNull();
	});

	it("excludes a playlist already at maxSize even if it's the best match (issue #210)", () => {
		const result = pickBestPlaylistForTrack(
			[1, 0],
			[
				{ id: 1, centroid: [1, 0], trackCount: 80 },
				{ id: 2, centroid: [0.9, 0.1], trackCount: 10 },
			],
			80,
			0.5,
		);
		expect(result).toBe(2);
	});

	it("returns null when every candidate is at or over maxSize", () => {
		const result = pickBestPlaylistForTrack(
			[1, 0],
			[{ id: 1, centroid: [1, 0], trackCount: 80 }],
			80,
			0.5,
		);
		expect(result).toBeNull();
	});

	it("ignores candidates without a centroid", () => {
		const result = pickBestPlaylistForTrack(
			[1, 0],
			[
				{ id: 1, centroid: null, trackCount: 0 },
				{ id: 2, centroid: [1, 0], trackCount: 0 },
			],
			80,
			0.5,
		);
		expect(result).toBe(2);
	});
});
