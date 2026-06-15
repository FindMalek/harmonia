import {
	waitlistSignupInput,
	waitlistSignupOutputSchema,
} from "@harmonia/common/schemas";
import { sendWaitlistConfirmationEmailTask } from "@harmonia/common/trigger/tasks/emails/send-waitlist-confirmation";
import { db } from "@harmonia/db";
import { waitlistSignup } from "@harmonia/db/schema/waitlist-signup";
import { logger } from "@harmonia/logger";

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
			const [row] = await db
				.insert(waitlistSignup)
				.values({ email })
				.onConflictDoNothing({ target: waitlistSignup.email })
				.returning({ id: waitlistSignup.id });

			// Only trigger confirmation email for genuinely new signups (idempotent on duplicate).
			if (row) {
				await sendWaitlistConfirmationEmailTask.trigger({
					waitlistId: row.id,
					email,
				});
				logger.info({ waitlistId: row.id }, "Waitlist signup received");
			}

			return { success: true };
		}),
};
