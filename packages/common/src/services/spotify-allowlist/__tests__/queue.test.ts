import { afterEach, describe, expect, it, vi } from "vitest";

// Chainable db/tx mock: every query-builder method returns `this`, awaiting resolves the next queued result.
const { db: dbMock, resultsQueue } = vi.hoisted(() => {
	const resultsQueue: unknown[] = [];
	function chain(): Record<string, unknown> {
		const obj: Record<string, unknown> = {};
		const passthrough = [
			"from",
			"where",
			"orderBy",
			"limit",
			"for",
			"set",
			"values",
		];
		for (const m of passthrough) obj[m] = () => obj;
		obj.returning = () => nextResult();
		// biome-ignore lint/suspicious/noThenProperty: intentionally thenable so `await tx.select()...` resolves to the queued mock result
		obj.then = (
			resolve: (v: unknown) => unknown,
			reject?: (e: unknown) => unknown,
		) => nextResult().then(resolve, reject);
		return obj;
	}
	function nextResult(): Promise<unknown> {
		const next = resultsQueue.shift();
		if (next instanceof Error) return Promise.reject(next);
		return Promise.resolve(next ?? []);
	}
	const db = {
		select: () => chain(),
		insert: () => chain(),
		update: () => chain(),
		transaction: vi.fn(async (cb: (tx: unknown) => unknown) => cb(db)),
	};
	return { db, resultsQueue };
});

vi.mock("@sonaraem/db", () => ({ db: dbMock }));
vi.mock("@sonaraem/logger", () => ({
	logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

import {
	enqueue,
	nextEligibleForCron,
	reclaimExpiredCooldowns,
	releaseSlot,
	timeoutReclaim,
	tryAcquireSlot,
	yieldCheck,
} from "../queue";

function push(...values: unknown[]) {
	resultsQueue.push(...values);
}

describe("queue", () => {
	afterEach(() => {
		resultsQueue.length = 0;
		vi.clearAllMocks();
	});

	describe("enqueue", () => {
		it("creates a new request when none exists", async () => {
			push([{ id: 1 }]); // insert().values().returning()
			const result = await enqueue({ userId: "u1" }, "manual");
			expect(result).toEqual({ requestId: 1, alreadyQueued: false });
		});

		it("returns the existing live request on a unique-constraint conflict", async () => {
			const conflict = Object.assign(new Error("duplicate"), {
				code: "23505",
				constraint: "spotify_allowlist_queue_request_one_live_per_user",
			});
			push(conflict); // insert throws
			push([{ id: 7 }]); // select existing live request
			const result = await enqueue({ userId: "u1" }, "cron");
			expect(result).toEqual({ requestId: 7, alreadyQueued: true });
		});

		it("re-throws errors that aren't the expected unique-constraint conflict", async () => {
			push(new Error("connection lost"));
			await expect(enqueue({ userId: "u1" }, "manual")).rejects.toThrow(
				"connection lost",
			);
		});

		it("uses the waitlist-signup constraint for pre-OAuth identities", async () => {
			const conflict = Object.assign(new Error("duplicate"), {
				code: "23505",
				constraint:
					"spotify_allowlist_queue_request_one_live_per_waitlist_signup",
			});
			push(conflict);
			push([{ id: 3 }]);
			const result = await enqueue({ waitlistSignupId: 42 }, "manual");
			expect(result).toEqual({ requestId: 3, alreadyQueued: true });
		});
	});

	describe("tryAcquireSlot", () => {
		it("refuses when the request is no longer waiting", async () => {
			push([{ id: 1, userId: "u1", status: "active" }]); // request lookup
			const result = await tryAcquireSlot(1);
			expect(result).toEqual({ acquired: false, reason: "not-your-turn" });
		});

		it("refuses when a higher-priority request is ahead in line", async () => {
			push([{ id: 5, userId: "u1", status: "waiting" }]); // request lookup
			push([{ id: 9 }]); // front-of-queue lookup — someone else
			const result = await tryAcquireSlot(5);
			expect(result).toEqual({ acquired: false, reason: "not-your-turn" });
		});

		it("refuses when it's this request's turn but no slot is free", async () => {
			push([{ id: 5, userId: "u1", status: "waiting" }]); // request lookup
			push([{ id: 5 }]); // front-of-queue lookup — this one
			push([]); // no available slot
			const result = await tryAcquireSlot(5);
			expect(result).toEqual({ acquired: false, reason: "no-slot-available" });
		});

		it("acquires the slot when it's this request's turn and one is free", async () => {
			push([{ id: 5, userId: "u1", status: "waiting" }]); // request lookup
			push([{ id: 5 }]); // front-of-queue lookup
			push([{ id: 2 }]); // available slot
			push([]); // slot update
			push([]); // request update
			const result = await tryAcquireSlot(5);
			expect(result).toEqual({ acquired: true, slotId: 2 });
		});
	});

	describe("releaseSlot", () => {
		it("moves the slot to cooldown and marks the request done", async () => {
			push([]); // slot update
			push([]); // request update
			await expect(releaseSlot(2)).resolves.toBeUndefined();
			expect(dbMock.transaction).toHaveBeenCalledTimes(1);
		});
	});

	describe("reclaimExpiredCooldowns", () => {
		it("returns the count of reclaimed slots", async () => {
			push([{ id: 1 }, { id: 2 }]);
			const count = await reclaimExpiredCooldowns();
			expect(count).toBe(2);
		});
	});

	describe("timeoutReclaim", () => {
		it("does nothing when no slots are stuck", async () => {
			push([]); // stuck-slot lookup
			const count = await timeoutReclaim();
			expect(count).toBe(0);
			expect(dbMock.transaction).not.toHaveBeenCalled();
		});

		it("force-releases every stuck slot and fails its active request", async () => {
			push([{ id: 1 }, { id: 2 }]); // stuck-slot lookup
			push([], [], [], []); // 2 slots x (slot update + request update)
			const count = await timeoutReclaim();
			expect(count).toBe(2);
			expect(dbMock.transaction).toHaveBeenCalledTimes(1);
		});
	});

	describe("yieldCheck", () => {
		it("is true when a manual request is waiting", async () => {
			push([{ id: 1 }]);
			await expect(yieldCheck()).resolves.toBe(true);
		});

		it("is false when nothing manual is waiting", async () => {
			push([]);
			await expect(yieldCheck()).resolves.toBe(false);
		});
	});

	describe("nextEligibleForCron", () => {
		it("returns eligible user ids", async () => {
			push([{ userId: "u1" }, { userId: "u2" }]);
			const ids = await nextEligibleForCron(4);
			expect(ids).toEqual(["u1", "u2"]);
		});
	});
});
