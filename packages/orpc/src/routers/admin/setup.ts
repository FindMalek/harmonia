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

// Only a real user_single_admin_idx unique-violation means someone else already won the race.
function isAdminRaceConflict(err: unknown): boolean {
	const asRecord = (v: unknown) =>
		typeof v === "object" && v !== null
			? (v as { code?: string; constraint?: string; cause?: unknown })
			: undefined;
	const isViolation = (r?: { code?: string; constraint?: string }) =>
		r?.code === "23505" && r?.constraint === "user_single_admin_idx";
	const direct = asRecord(err);
	return isViolation(direct) || isViolation(asRecord(direct?.cause));
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

	const normalizedEmail = input.email.toLowerCase().trim();

	try {
		// No headers/request passed — bypasses auth.api.createUser's normal session check (better-auth's internal/privileged call path).
		await adminAuth.api.createUser({
			body: {
				email: normalizedEmail,
				password: input.password,
				name: input.name,
				role: "admin",
			},
		});
	} catch (err) {
		logger.error({ err }, "admin.setup.create: createUser failed");

		if (isAdminRaceConflict(err)) {
			throw new ORPCError("CONFLICT", {
				message: "An admin account already exists.",
			});
		}

		// createUser inserts the user row before linking the credential, so a later failure leaves an orphan that would otherwise permanently lock /setup — clean it up so the operator can just retry.
		try {
			await db.delete(user).where(eq(user.email, normalizedEmail));
		} catch (cleanupErr) {
			logger.error(
				{ err: cleanupErr, email: normalizedEmail },
				"admin.setup.create: failed to clean up orphaned user row",
			);
		}

		if (err instanceof APIError) {
			throw new ORPCError("BAD_REQUEST", { message: err.message });
		}
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
