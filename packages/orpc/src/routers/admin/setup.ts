import {
	type AdminSetupCreateOutput,
	type AdminSetupStatusOutput,
	adminSetupCreateInput,
	adminSetupCreateOutputSchema,
	adminSetupStatusOutputSchema,
} from "@harmonia/common/schemas";
import { adminAuth } from "@harmonia/core";
import { db } from "@harmonia/db";
import { user } from "@harmonia/db/schema/auth";
import { ORPCError } from "@orpc/server";
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
		// Called with no headers/request — bypasses the session/permission
		// check that auth.api.createUser enforces when hit as a real HTTP
		// request (see better-auth's admin plugin routes.mjs). This is the
		// same "internal/privileged call" path packages/db's seed script
		// effectively re-implements by hand for local dev.
		await adminAuth.api.createUser({
			body: {
				email: input.email.toLowerCase().trim(),
				password: input.password,
				name: input.name,
				role: "admin",
			},
		});
	} catch (err) {
		// The user_single_admin_idx unique index is the real backstop for a
		// concurrent double-submit — if someone else's request won that race
		// between our count check and this insert, report the same clean
		// "already exists" error instead of a raw DB error.
		const raceLost = (await adminCount()) > 0;
		if (raceLost) {
			throw new ORPCError("CONFLICT", {
				message: "An admin account already exists.",
			});
		}
		const message =
			err instanceof Error ? err.message : "Failed to create admin account";
		throw new ORPCError("BAD_REQUEST", { message });
	}

	return { success: true };
}

// Public — there is no session yet the first time this ever needs to run.
// Actual race-safety comes from the database (user_single_admin_idx in
// packages/db/src/schema/auth.ts), not from the count checks above, which
// only drive the UI (redirect to /login vs show the form).
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
