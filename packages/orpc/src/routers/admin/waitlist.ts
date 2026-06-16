import {
	waitlistAdminBulkApproveInput,
	waitlistAdminListInput,
	waitlistAdminListOutputSchema,
	waitlistAdminUpdateStatusInput,
} from "@harmonia/common/schemas";
import { sendWaitlistApprovedEmailTask } from "@harmonia/common/trigger/tasks/emails/send-waitlist-approved";
import { db } from "@harmonia/db";
import { waitlistSignup } from "@harmonia/db/schema/waitlist-signup";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure } from "../../procedures";

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

			const [updated] = await db
				.update(waitlistSignup)
				.set({
					status,
					note: note ?? null,
					approvedAt: status === "approved" ? new Date() : null,
					updatedAt: new Date(),
				})
				.where(eq(waitlistSignup.id, id))
				.returning({ id: waitlistSignup.id, email: waitlistSignup.email });

			if (!updated) {
				return { success: false };
			}

			if (status === "approved") {
				await sendWaitlistApprovedEmailTask.trigger({
					waitlistId: updated.id,
					email: updated.email,
				});
			}

			return { success: true };
		}),

	bulkApprove: adminProcedure
		.input(waitlistAdminBulkApproveInput)
		.output(z.object({ approved: z.number() }))
		.handler(async ({ input }) => {
			const { ids } = input;
			let approved = 0;

			await Promise.all(
				ids.map(async (id) => {
					const [updated] = await db
						.update(waitlistSignup)
						.set({
							status: "approved",
							approvedAt: new Date(),
							updatedAt: new Date(),
						})
						.where(
							and(
								eq(waitlistSignup.id, id),
								or(
									eq(waitlistSignup.status, "pending"),
									eq(waitlistSignup.status, "rejected"),
								),
							),
						)
						.returning({ id: waitlistSignup.id, email: waitlistSignup.email });

					if (updated) {
						approved++;
						await sendWaitlistApprovedEmailTask.trigger({
							waitlistId: updated.id,
							email: updated.email,
						});
					}
				}),
			);

			return { approved };
		}),
};
