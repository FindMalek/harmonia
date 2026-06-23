import { beforeEach, describe, expect, it, vi } from "vitest";

const selectMock = vi.fn();

vi.mock("@harmonia/db", () => ({
	db: {
		select: selectMock,
	},
}));

vi.mock("@harmonia/db/schema/auth", () => ({
	user: {
		isApproved: "isApproved",
		banned: "banned",
		id: "id",
	},
}));

vi.mock("drizzle-orm", () => ({
	eq: vi.fn((_col, val) => val),
}));

describe("assertUserApproved", () => {
	beforeEach(() => {
		selectMock.mockReset();
	});

	it("throws FORBIDDEN when user is not approved", async () => {
		selectMock.mockReturnValue({
			from: vi.fn(() => ({
				where: vi.fn(() =>
					Promise.resolve([{ isApproved: false, banned: false }]),
				),
			})),
		});

		const { assertUserApproved } = await import("../approval-gate");
		await expect(assertUserApproved("user-1")).rejects.toMatchObject({
			code: "FORBIDDEN",
		});
	});

	it("throws FORBIDDEN when user is banned", async () => {
		selectMock.mockReturnValue({
			from: vi.fn(() => ({
				where: vi.fn(() =>
					Promise.resolve([{ isApproved: true, banned: true }]),
				),
			})),
		});

		const { assertUserApproved } = await import("../approval-gate");
		await expect(assertUserApproved("user-1")).rejects.toMatchObject({
			code: "FORBIDDEN",
		});
	});

	it("passes when user is approved and not banned", async () => {
		selectMock.mockReturnValue({
			from: vi.fn(() => ({
				where: vi.fn(() =>
					Promise.resolve([{ isApproved: true, banned: false }]),
				),
			})),
		});

		const { assertUserApproved } = await import("../approval-gate");
		await expect(assertUserApproved("user-1")).resolves.toBeUndefined();
	});
});
