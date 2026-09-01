import { ORPCError } from "@orpc/server";
import {
	type AdminSetupCreateOutput,
	type AdminSetupStatusOutput,
	adminSetupCreateInput,
	adminSetupCreateOutputSchema,
	adminSetupStatusOutputSchema,
} from "@sonaraem/common/schemas";
import { adminAuth } from "@sonaraem/core";
import { db } from "@sonaraem/db";
import { user } from "@sonaraem/db/schema/auth";
import { logger } from "@sonaraem/logger";
import { APIError } from "better-auth";
import { count, eq } from "drizzle-orm";
import { z } from "zod";

import { publicProcedure } from "../../procedures";

async function adminCount(): Promise<number> {
	const [row] = await db
		.select({ count: count() })
		.from(user)
		.where(eq(user.role, "admin"));
	return row?.count ?? 0;
}

export async function checkAdminSetupStatus(): Promise<AdminSetupStatusOutput> {
	const existing = await adminCount();
	return { needsSetup: existing === 0 };
}

export async function createAdminAccount(input: {
	name: string;
	email: string;
	password: string;
}): Promise<AdminSetupCreateOutput> {
	const existing = await adminCount();
	if (existing > 0) {
		throw new ORPCError("CONFLICT", {
			message: "An admin account already exists.",
		});
	}

	try {
		// No headers/request passed — bypasses auth.api.createUser's normal session check (better-auth's internal/privileged call path).
		await adminAuth.api.createUser({
			body: {
				email: input.email.toLowerCase().trim(),
				password: input.password,
				name: input.name,
				role: "admin",
			},
		});
	} catch (err) {
		// user_single_admin_idx is the real race backstop — a concurrent double-submit lands here as a DB error, not an APIError.
		if ((await adminCount()) > 0) {
			throw new ORPCError("CONFLICT", {
				message: "An admin account already exists.",
			});
		}
		if (err instanceof APIError) {
			throw new ORPCError("BAD_REQUEST", { message: err.message });
		}
		logger.error({ err }, "admin.setup.create: unexpected failure");
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Failed to create admin account",
		});
	}

	return { success: true };
}

// Public — there is no session yet the first time this ever runs; the database enforces the "only once" guarantee, this just drives the UI.
export const adminSetupRouter = {
	status: publicProcedure
		.input(z.void())
		.output(adminSetupStatusOutputSchema)
		.handler(() => checkAdminSetupStatus()),

	create: publicProcedure
		.input(adminSetupCreateInput)
		.output(adminSetupCreateOutputSchema)
		.handler(({ input }) => createAdminAccount(input)),
};
