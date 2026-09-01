import { APIError } from "better-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

const selectMock = vi.fn();
const deleteMock = vi.fn();
const createUserMock = vi.fn();

vi.mock("@sonaraem/db", () => ({
	db: {
		select: selectMock,
		delete: deleteMock,
	},
}));

vi.mock("@sonaraem/db/schema/auth", () => ({
	user: { role: "role", email: "email" },
}));

vi.mock("@sonaraem/core", () => ({
	adminAuth: {
		api: {
			createUser: createUserMock,
		},
	},
}));

vi.mock("drizzle-orm", () => ({
	eq: vi.fn((_col, val) => val),
	count: vi.fn(() => "count"),
}));

function mockAdminCount(n: number) {
	selectMock.mockReturnValue({
		from: vi.fn(() => ({
			where: vi.fn(() => Promise.resolve([{ count: n }])),
		})),
	});
}

describe("admin setup", () => {
	beforeEach(() => {
		selectMock.mockReset();
		deleteMock.mockReset();
		deleteMock.mockReturnValue({ where: vi.fn(() => Promise.resolve()) });
		createUserMock.mockReset();
	});

	it("checkAdminSetupStatus reports needsSetup when no admin exists", async () => {
		mockAdminCount(0);
		const { checkAdminSetupStatus } = await import("../setup");
		await expect(checkAdminSetupStatus()).resolves.toEqual({
			needsSetup: true,
		});
	});

	it("checkAdminSetupStatus reports setup already done when an admin exists", async () => {
		mockAdminCount(1);
		const { checkAdminSetupStatus } = await import("../setup");
		await expect(checkAdminSetupStatus()).resolves.toEqual({
			needsSetup: false,
		});
	});

	it("createAdminAccount rejects with CONFLICT if an admin already exists", async () => {
		mockAdminCount(1);
		const { createAdminAccount } = await import("../setup");
		await expect(
			createAdminAccount({
				name: "Admin",
				email: "admin@sonaraem.com",
				password: "password123",
			}),
		).rejects.toMatchObject({ code: "CONFLICT" });
		expect(createUserMock).not.toHaveBeenCalled();
	});

	it("createAdminAccount creates the account when none exists yet", async () => {
		mockAdminCount(0);
		createUserMock.mockResolvedValue({ user: { id: "1" } });
		const { createAdminAccount } = await import("../setup");
		await expect(
			createAdminAccount({
				name: "Admin",
				email: "Admin@Sonaraem.com",
				password: "password123",
			}),
		).resolves.toEqual({ success: true });
		expect(createUserMock).toHaveBeenCalledWith({
			body: {
				email: "admin@sonaraem.com",
				password: "password123",
				name: "Admin",
				role: "admin",
			},
		});
		expect(deleteMock).not.toHaveBeenCalled();
	});

	it("createAdminAccount reports CONFLICT if a concurrent request won the race", async () => {
		mockAdminCount(0);
		createUserMock.mockRejectedValue(
			Object.assign(new Error("duplicate key value"), {
				code: "23505",
				constraint: "user_single_admin_idx",
			}),
		);
		const { createAdminAccount } = await import("../setup");
		await expect(
			createAdminAccount({
				name: "Admin",
				email: "admin@sonaraem.com",
				password: "password123",
			}),
		).rejects.toMatchObject({ code: "CONFLICT" });
		// Someone else's row — nothing of ours to clean up.
		expect(deleteMock).not.toHaveBeenCalled();
	});

	it("createAdminAccount does not match a race conflict from mixed direct/cause fields", async () => {
		// code lives on the direct error, constraint only on an unrelated cause —
		// these must be read as a pair per-object, not combined across objects.
		mockAdminCount(0);
		createUserMock.mockRejectedValue(
			Object.assign(new Error("duplicate key value"), {
				code: "23505",
				cause: { constraint: "user_single_admin_idx" },
			}),
		);
		const { createAdminAccount } = await import("../setup");
		await expect(
			createAdminAccount({
				name: "Admin",
				email: "admin@sonaraem.com",
				password: "password123",
			}),
		).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
	});

	it("createAdminAccount surfaces a better-auth APIError's message as BAD_REQUEST", async () => {
		mockAdminCount(0);
		createUserMock.mockRejectedValue(
			new APIError("BAD_REQUEST", { message: "USER_ALREADY_EXISTS" }),
		);
		const { createAdminAccount } = await import("../setup");
		await expect(
			createAdminAccount({
				name: "Admin",
				email: "taken@sonaraem.com",
				password: "password123",
			}),
		).rejects.toMatchObject({
			code: "BAD_REQUEST",
			message: "USER_ALREADY_EXISTS",
		});
	});

	it("createAdminAccount cleans up the orphaned user row on a post-insert failure", async () => {
		// createUser inserts the user row before hashing the password / linking
		// the credential account — a failure past that point must not leave a
		// dangling row that permanently locks /setup.
		mockAdminCount(0);
		createUserMock.mockRejectedValue(new Error("session cookie write failed"));
		const { createAdminAccount } = await import("../setup");
		await expect(
			createAdminAccount({
				name: "Admin",
				email: "Admin@Sonaraem.com",
				password: "password123",
			}),
		).rejects.toMatchObject({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to create admin account",
		});
		expect(deleteMock).toHaveBeenCalledTimes(1);
	});

	it("createAdminAccount hides an unrelated error behind a generic message", async () => {
		mockAdminCount(0);
		createUserMock.mockRejectedValue(new Error("connection terminated"));
		const { createAdminAccount } = await import("../setup");
		await expect(
			createAdminAccount({
				name: "Admin",
				email: "admin@sonaraem.com",
				password: "password123",
			}),
		).rejects.toMatchObject({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to create admin account",
		});
	});
});
