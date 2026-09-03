import { afterEach, describe, expect, it, vi } from "vitest";

const { dbMock, queueMock, waitMock, manageAllowlistEntryMock } = vi.hoisted(
	() => ({
		dbMock: { select: vi.fn() },
		queueMock: {
			enqueue: vi.fn(),
			tryAcquireSlot: vi.fn(),
			releaseSlot: vi.fn(),
		},
		waitMock: { for: vi.fn(() => Promise.resolve()) },
		manageAllowlistEntryMock: { triggerAndWait: vi.fn() },
	}),
);

vi.mock("@sonaraem/db", () => ({ db: dbMock }));
vi.mock("@sonaraem/logger", () => ({
	logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));
vi.mock("@trigger.dev/sdk", () => ({ wait: waitMock }));
vi.mock("../../../services/spotify-allowlist", () => queueMock);
vi.mock("../../tasks/spotify-allowlist/manage-allowlist-entry", () => ({
	manageAllowlistEntryTask: manageAllowlistEntryMock,
}));

import { user } from "@sonaraem/db/schema/auth";
import { pipelineRun } from "@sonaraem/db/schema/pipeline-run";

import {
	AllowlistSlotTimeoutError,
	withAllowlistSlot,
} from "../allowlist-slot";

function mockDbLookups(opts: { triggeredBy: "user" | "cron"; email?: string }) {
	const email = opts.email ?? "user@example.com";
	dbMock.select.mockReturnValue({
		from: (table: unknown) => ({
			where: () =>
				Promise.resolve(
					table === pipelineRun
						? [{ triggeredBy: opts.triggeredBy }]
						: table === user
							? [{ email }]
							: [],
				),
		}),
	});
}

function mockAllowlistEntryResult(unwrap: () => Promise<unknown>) {
	manageAllowlistEntryMock.triggerAndWait.mockReturnValue({ unwrap });
}

describe("withAllowlistSlot", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("acquires immediately, adds the email, runs the work, removes it, and releases the slot", async () => {
		mockDbLookups({ triggeredBy: "user", email: "user@example.com" });
		queueMock.enqueue.mockResolvedValue({ requestId: 1, alreadyQueued: false });
		queueMock.tryAcquireSlot.mockResolvedValue({ acquired: true, slotId: 9 });
		mockAllowlistEntryResult(() => Promise.resolve({ confirmed: true }));

		const work = vi.fn().mockResolvedValue("done");
		const result = await withAllowlistSlot("u1", 42, work);

		expect(result).toBe("done");
		expect(queueMock.enqueue).toHaveBeenCalledWith({ userId: "u1" }, "manual");
		expect(manageAllowlistEntryMock.triggerAndWait).toHaveBeenNthCalledWith(1, {
			email: "user@example.com",
			action: "add",
		});
		expect(manageAllowlistEntryMock.triggerAndWait).toHaveBeenNthCalledWith(2, {
			email: "user@example.com",
			action: "remove",
		});
		expect(work).toHaveBeenCalledTimes(1);
		expect(queueMock.releaseSlot).toHaveBeenCalledWith(9);
		expect(waitMock.for).not.toHaveBeenCalled();
	});

	it("derives cron priority from the pipeline run's triggeredBy", async () => {
		mockDbLookups({ triggeredBy: "cron" });
		queueMock.enqueue.mockResolvedValue({ requestId: 1, alreadyQueued: false });
		queueMock.tryAcquireSlot.mockResolvedValue({ acquired: true, slotId: 2 });
		mockAllowlistEntryResult(() => Promise.resolve({ confirmed: true }));

		await withAllowlistSlot("u2", 43, async () => "ok");

		expect(queueMock.enqueue).toHaveBeenCalledWith({ userId: "u2" }, "cron");
	});

	it("polls until a slot frees up", async () => {
		mockDbLookups({ triggeredBy: "user" });
		queueMock.enqueue.mockResolvedValue({ requestId: 1, alreadyQueued: false });
		queueMock.tryAcquireSlot
			.mockResolvedValueOnce({ acquired: false, reason: "no-slot-available" })
			.mockResolvedValueOnce({ acquired: false, reason: "no-slot-available" })
			.mockResolvedValueOnce({ acquired: true, slotId: 5 });
		mockAllowlistEntryResult(() => Promise.resolve({ confirmed: true }));

		const result = await withAllowlistSlot("u3", 1, async () => "ok");

		expect(result).toBe("ok");
		expect(queueMock.tryAcquireSlot).toHaveBeenCalledTimes(3);
		expect(waitMock.for).toHaveBeenCalledTimes(2);
	});

	it("removes the email and releases the slot even when the work throws", async () => {
		mockDbLookups({ triggeredBy: "user" });
		queueMock.enqueue.mockResolvedValue({ requestId: 1, alreadyQueued: false });
		queueMock.tryAcquireSlot.mockResolvedValue({ acquired: true, slotId: 7 });
		mockAllowlistEntryResult(() => Promise.resolve({ confirmed: true }));

		await expect(
			withAllowlistSlot("u4", 1, async () => {
				throw new Error("sync blew up");
			}),
		).rejects.toThrow("sync blew up");

		expect(manageAllowlistEntryMock.triggerAndWait).toHaveBeenNthCalledWith(2, {
			email: "user@example.com",
			action: "remove",
		});
		expect(queueMock.releaseSlot).toHaveBeenCalledWith(7);
	});

	it("releases the slot without running work when adding the email fails", async () => {
		mockDbLookups({ triggeredBy: "user" });
		queueMock.enqueue.mockResolvedValue({ requestId: 1, alreadyQueued: false });
		queueMock.tryAcquireSlot.mockResolvedValue({ acquired: true, slotId: 4 });
		mockAllowlistEntryResult(() =>
			Promise.reject(new Error("dashboard rejected the add")),
		);

		const work = vi.fn();
		await expect(withAllowlistSlot("u6", 1, work)).rejects.toThrow(
			"dashboard rejected the add",
		);

		expect(work).not.toHaveBeenCalled();
		expect(queueMock.releaseSlot).toHaveBeenCalledWith(4);
	});

	it("throws AllowlistSlotTimeoutError when the pool never frees up", async () => {
		mockDbLookups({ triggeredBy: "cron" });
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
