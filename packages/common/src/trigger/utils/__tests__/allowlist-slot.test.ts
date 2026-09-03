import { afterEach, describe, expect, it, vi } from "vitest";

const { dbMock, queueMock, waitMock } = vi.hoisted(() => ({
	dbMock: { select: vi.fn() },
	queueMock: {
		enqueue: vi.fn(),
		tryAcquireSlot: vi.fn(),
		releaseSlot: vi.fn(),
	},
	waitMock: { for: vi.fn(() => Promise.resolve()) },
}));

vi.mock("@sonaraem/db", () => ({ db: dbMock }));
vi.mock("@sonaraem/logger", () => ({
	logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));
vi.mock("@trigger.dev/sdk", () => ({ wait: waitMock }));
vi.mock("../../../services/spotify-allowlist", () => queueMock);

import {
	AllowlistSlotTimeoutError,
	withAllowlistSlot,
} from "../allowlist-slot";

function mockPipelineRunLookup(triggeredBy: "user" | "cron") {
	dbMock.select.mockReturnValue({
		from: () => ({
			where: () => Promise.resolve([{ triggeredBy }]),
		}),
	});
}

describe("withAllowlistSlot", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("acquires immediately, runs the work, and releases the slot", async () => {
		mockPipelineRunLookup("user");
		queueMock.enqueue.mockResolvedValue({ requestId: 1, alreadyQueued: false });
		queueMock.tryAcquireSlot.mockResolvedValue({ acquired: true, slotId: 9 });

		const work = vi.fn().mockResolvedValue("done");
		const result = await withAllowlistSlot("u1", 42, work);

		expect(result).toBe("done");
		expect(queueMock.enqueue).toHaveBeenCalledWith({ userId: "u1" }, "manual");
		expect(work).toHaveBeenCalledTimes(1);
		expect(queueMock.releaseSlot).toHaveBeenCalledWith(9);
		expect(waitMock.for).not.toHaveBeenCalled();
	});

	it("derives cron priority from the pipeline run's triggeredBy", async () => {
		mockPipelineRunLookup("cron");
		queueMock.enqueue.mockResolvedValue({ requestId: 1, alreadyQueued: false });
		queueMock.tryAcquireSlot.mockResolvedValue({ acquired: true, slotId: 2 });

		await withAllowlistSlot("u2", 43, async () => "ok");

		expect(queueMock.enqueue).toHaveBeenCalledWith({ userId: "u2" }, "cron");
	});

	it("polls until a slot frees up", async () => {
		mockPipelineRunLookup("user");
		queueMock.enqueue.mockResolvedValue({ requestId: 1, alreadyQueued: false });
		queueMock.tryAcquireSlot
			.mockResolvedValueOnce({ acquired: false, reason: "no-slot-available" })
			.mockResolvedValueOnce({ acquired: false, reason: "no-slot-available" })
			.mockResolvedValueOnce({ acquired: true, slotId: 5 });

		const result = await withAllowlistSlot("u3", 1, async () => "ok");

		expect(result).toBe("ok");
		expect(queueMock.tryAcquireSlot).toHaveBeenCalledTimes(3);
		expect(waitMock.for).toHaveBeenCalledTimes(2);
	});

	it("releases the slot even when the work throws", async () => {
		mockPipelineRunLookup("user");
		queueMock.enqueue.mockResolvedValue({ requestId: 1, alreadyQueued: false });
		queueMock.tryAcquireSlot.mockResolvedValue({ acquired: true, slotId: 7 });

		await expect(
			withAllowlistSlot("u4", 1, async () => {
				throw new Error("sync blew up");
			}),
		).rejects.toThrow("sync blew up");

		expect(queueMock.releaseSlot).toHaveBeenCalledWith(7);
	});

	it("throws AllowlistSlotTimeoutError when the pool never frees up", async () => {
		mockPipelineRunLookup("cron");
		queueMock.enqueue.mockResolvedValue({ requestId: 1, alreadyQueued: false });
		queueMock.tryAcquireSlot.mockResolvedValue({
			acquired: false,
			reason: "no-slot-available",
		});

		// Fast-forward past the 20-minute wait budget instead of waiting in real time.
		const base = Date.now();
		let calls = 0;
		vi.spyOn(Date, "now").mockImplementation(() => {
			calls += 1;
			return base + calls * 15 * 60 * 1000;
		});

		const work = vi.fn();
		await expect(withAllowlistSlot("u5", 1, work)).rejects.toThrow(
			AllowlistSlotTimeoutError,
		);
		expect(work).not.toHaveBeenCalled();
		expect(queueMock.releaseSlot).not.toHaveBeenCalled();
	});
});
