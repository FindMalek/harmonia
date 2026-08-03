import { describe, expect, it, vi } from "vitest";

vi.mock("@harmonia/db", () => ({ db: {}, conflictValue: vi.fn() }));

import { partitionTracksByKnownLikedAt } from "../library-sync";

describe("partitionTracksByKnownLikedAt", () => {
	it("puts every track in withoutLikedAt when nothing is known", () => {
		const result = partitionTracksByKnownLikedAt(
			[{ id: "a" }, { id: "b" }],
			new Map(),
		);
		expect(result.withLikedAt).toEqual([]);
		expect(result.withoutLikedAt).toEqual([{ id: "a" }, { id: "b" }]);
	});

	it("puts every track in withLikedAt when all are known", () => {
		const likedAt = new Date("2026-01-01T00:00:00Z");
		const result = partitionTracksByKnownLikedAt(
			[{ id: "a" }, { id: "b" }],
			new Map([
				["a", likedAt],
				["b", likedAt],
			]),
		);
		expect(result.withLikedAt).toEqual([
			{ id: "a", addedAt: likedAt },
			{ id: "b", addedAt: likedAt },
		]);
		expect(result.withoutLikedAt).toEqual([]);
	});

	it("splits a mix of known and unknown tracks", () => {
		const likedAt = new Date("2026-02-01T00:00:00Z");
		const result = partitionTracksByKnownLikedAt(
			[{ id: "a" }, { id: "b" }, { id: "c" }],
			new Map([["b", likedAt]]),
		);
		expect(result.withLikedAt).toEqual([{ id: "b", addedAt: likedAt }]);
		expect(result.withoutLikedAt).toEqual([{ id: "a" }, { id: "c" }]);
	});

	it("preserves extra fields on the input track objects", () => {
		const likedAt = new Date("2026-03-01T00:00:00Z");
		const result = partitionTracksByKnownLikedAt(
			[{ id: "a", name: "Track A" }],
			new Map([["a", likedAt]]),
		);
		expect(result.withLikedAt).toEqual([
			{ id: "a", name: "Track A", addedAt: likedAt },
		]);
	});
});
