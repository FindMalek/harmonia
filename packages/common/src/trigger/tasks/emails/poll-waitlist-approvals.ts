import { db } from "@harmonia/db";
import { waitlistSignup } from "@harmonia/db/schema/waitlist-signup";
import { schedules } from "@trigger.dev/sdk";
import { and, eq, isNull } from "drizzle-orm";

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

		for (const row of rows) {
			await db
				.update(waitlistSignup)
				.set({ approvedAt: new Date() })
				.where(
					and(eq(waitlistSignup.id, row.id), isNull(waitlistSignup.approvedAt)),
				);

			await sendWaitlistApprovedEmailTask.trigger({
				waitlistId: row.id,
				email: row.email,
			});

			await db
				.update(waitlistSignup)
				.set({ approvalEmailSentAt: new Date() })
				.where(eq(waitlistSignup.id, row.id));
		}

		return { processed: rows.length };
	},
});
