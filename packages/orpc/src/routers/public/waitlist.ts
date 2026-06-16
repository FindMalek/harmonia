import {
	waitlistSignupInput,
	waitlistSignupOutputSchema,
} from "@harmonia/common/schemas";
import { sendWaitlistConfirmationEmailTask } from "@harmonia/common/trigger/tasks/emails/send-waitlist-confirmation";
import { db } from "@harmonia/db";
import { waitlistSignup } from "@harmonia/db/schema/waitlist-signup";
import { logger } from "@harmonia/logger";
import { and, eq, isNull } from "drizzle-orm";

import { publicProcedure } from "../../procedures";

export const waitlistRouter = {
	signup: publicProcedure
		.meta({
			openapi: {
				method: "POST",
				path: "/waitlist/signup",
				summary: "Join the waitlist",
				tags: ["waitlist"],
			},
		})
		.input(waitlistSignupInput)
		.output(waitlistSignupOutputSchema)
		.handler(async ({ input }) => {
			// Honeypot tripped: pretend success, do nothing.
			if (input.website) {
				return { success: true };
			}

			const email = input.email.toLowerCase().trim();
			const [inserted] = await db
				.insert(waitlistSignup)
				.values({ email })
				.onConflictDoNothing({ target: waitlistSignup.email })
				.returning({ id: waitlistSignup.id });

			let waitlistId = inserted?.id ?? null;

			// If the insert was a no-op (duplicate email), check whether the
			// confirmation email was never sent — this recovers signups where the
			// initial trigger() call failed after the row was created.
			if (!waitlistId) {
				const [existing] = await db
					.select({
						id: waitlistSignup.id,
						confirmationEmailSentAt: waitlistSignup.confirmationEmailSentAt,
					})
					.from(waitlistSignup)
					.where(
						and(
							eq(waitlistSignup.email, email),
							isNull(waitlistSignup.confirmationEmailSentAt),
						),
					);
				waitlistId = existing?.id ?? null;
			}

			if (waitlistId !== null) {
				await sendWaitlistConfirmationEmailTask.trigger({
					waitlistId,
					email,
				});
				if (inserted) {
					logger.info({ waitlistId }, "Waitlist signup received");
				}
			}

			return { success: true };
		}),
};
