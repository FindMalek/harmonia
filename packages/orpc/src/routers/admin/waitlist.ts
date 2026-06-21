import {
	waitlistAdminBulkIdsInput,
	waitlistAdminListInput,
	waitlistAdminListOutputSchema,
	waitlistAdminUpdateStatusInput,
} from "@harmonia/common/schemas";
import { sendWaitlistApprovedEmailTask } from "@harmonia/common/trigger/tasks/emails/send-waitlist-approved";
import { db } from "@harmonia/db";
import { waitlistSignup } from "@harmonia/db/schema/waitlist-signup";
import { createHash, randomBytes } from "crypto";
import { and, count, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { z } from "zod";

import { logger } from "@harmonia/logger";
import { adminProcedure } from "../../procedures";

function generateInviteToken() {
	const raw = randomBytes(32).toString("hex");
	const hash = createHash("sha256").update(raw).digest("hex");
	const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
	return { raw, hash, expiresAt };
}

// The poll-waitlist-approvals cron is the safety net if this fails —
// don't let a Trigger.dev hiccup fail the admin's approve action.
async function triggerApprovedEmailSafely(payload: {
	waitlistId: number;
	email: string;
}) {
	try {
		await sendWaitlistApprovedEmailTask.trigger(payload);
	} catch (error) {
		logger.warn(
			{ waitlistId: payload.waitlistId, error },
			"Failed to trigger waitlist approved email task — poll cron will retry",
		);
	}
}

export const adminWaitlistRouter = {
	list: adminProcedure
		.input(waitlistAdminListInput)
		.output(waitlistAdminListOutputSchema)
		.handler(async ({ input }) => {
			const { page, pageSize, status, q } = input;
			const offset = (page - 1) * pageSize;

			const where = and(
				status ? eq(waitlistSignup.status, status) : undefined,
				q ? ilike(waitlistSignup.email, `%${q}%`) : undefined,
			);

			const [items, totalRows] = await Promise.all([
				db
					.select()
					.from(waitlistSignup)
					.where(where)
					.orderBy(desc(waitlistSignup.createdAt))
					.limit(pageSize)
					.offset(offset),
				db.select({ total: count() }).from(waitlistSignup).where(where),
			]);

			const total = totalRows[0]?.total ?? 0;

			return {
				items,
				total,
				page,
				pageSize,
				pageCount: Math.ceil(total / pageSize),
			};
		}),

	updateStatus: adminProcedure
		.input(waitlistAdminUpdateStatusInput)
		.output(z.object({ success: z.boolean() }))
		.handler(async ({ input }) => {
			const { id, status, note } = input;

			const token = status === "approved" ? generateInviteToken() : undefined;

			const [updated] = await db
				.update(waitlistSignup)
				.set({
					status,
					...(note !== undefined && { note }),
					approvedAt: status === "approved" ? new Date() : null,
					...(token && {
						inviteToken: token.hash,
						inviteTokenRaw: token.raw,
						inviteTokenExpiresAt: token.expiresAt,
					}),
					updatedAt: new Date(),
				})
				.where(eq(waitlistSignup.id, id))
				.returning({ id: waitlistSignup.id, email: waitlistSignup.email });

			if (!updated) {
				return { success: false };
			}

			if (status === "approved") {
				await triggerApprovedEmailSafely({
					waitlistId: updated.id,
					email: updated.email,
				});
			}

			return { success: true };
		}),

	bulkApprove: adminProcedure
		.input(waitlistAdminBulkIdsInput)
		.output(z.object({ approved: z.number() }))
		.handler(async ({ input }) => {
			const { ids } = input;

			// Fetch only rows that aren't already approved so we generate tokens for each
			const rows = await db
				.select({ id: waitlistSignup.id, email: waitlistSignup.email })
				.from(waitlistSignup)
				.where(
					and(
						inArray(waitlistSignup.id, ids),
						or(
							eq(waitlistSignup.status, "pending"),
							eq(waitlistSignup.status, "rejected"),
						),
					),
				);

			if (rows.length === 0) return { approved: 0 };

			// Update each row with its own token (can't do a single set; tokens differ per row)
			await Promise.all(
				rows.map((row) => {
					const token = generateInviteToken();
					return db
						.update(waitlistSignup)
						.set({
							status: "approved",
							approvedAt: new Date(),
							inviteToken: token.hash,
							inviteTokenRaw: token.raw,
							inviteTokenExpiresAt: token.expiresAt,
							updatedAt: new Date(),
						})
						.where(eq(waitlistSignup.id, row.id));
				}),
			);

			try {
				await sendWaitlistApprovedEmailTask.batchTrigger(
					rows.map((row) => ({
						payload: { waitlistId: row.id, email: row.email },
					})),
				);
			} catch (error) {
				logger.warn(
					{ ids: rows.map((r) => r.id), error },
					"Failed to batch-trigger waitlist approved email tasks — poll cron will retry",
				);
			}

			return { approved: rows.length };
		}),

	bulkReject: adminProcedure
		.input(waitlistAdminBulkIdsInput)
		.output(z.object({ rejected: z.number() }))
		.handler(async ({ input }) => {
			const { ids } = input;

			const updated = await db
				.update(waitlistSignup)
				.set({
					status: "rejected",
					approvedAt: null,
					updatedAt: new Date(),
				})
				.where(
					and(
						inArray(waitlistSignup.id, ids),
						or(
							eq(waitlistSignup.status, "pending"),
							eq(waitlistSignup.status, "approved"),
						),
					),
				)
				.returning({ id: waitlistSignup.id });

			return { rejected: updated.length };
		}),
};
