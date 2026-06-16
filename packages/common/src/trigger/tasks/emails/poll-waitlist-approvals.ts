import { db } from "@harmonia/db";
import { waitlistSignup } from "@harmonia/db/schema/waitlist-signup";
import { schedules } from "@trigger.dev/sdk";
import { and, eq, inArray, isNull } from "drizzle-orm";

import { sendWaitlistApprovedEmailTask } from "./send-waitlist-approved";

export const pollWaitlistApprovalsTask = schedules.task({
	id: "email-poll-waitlist-approvals",
	cron: "*/15 * * * *",
	run: async () => {
		const rows = await db
			.select({ id: waitlistSignup.id, email: waitlistSignup.email })
			.from(waitlistSignup)
			.where(
				and(
					eq(waitlistSignup.status, "approved"),
					isNull(waitlistSignup.approvalEmailSentAt),
				),
			);

		if (rows.length === 0) return { processed: 0 };

		// Bulk-stamp approvedAt for all newly-seen approved rows (idempotent guard).
		const ids = rows.map((r) => r.id);
		await db
			.update(waitlistSignup)
			.set({ approvedAt: new Date() })
			.where(
				and(inArray(waitlistSignup.id, ids), isNull(waitlistSignup.approvedAt)),
			);

		// Trigger all approval email tasks in parallel.
		// approvalEmailSentAt is stamped inside sendWaitlistApprovedNotification only
		// on confirmed delivery, so failed tasks leave the row visible to future polls.
		await Promise.all(
			rows.map((row) =>
				sendWaitlistApprovedEmailTask.trigger({
					waitlistId: row.id,
					email: row.email,
				}),
			),
		);

		return { processed: rows.length };
	},
});
