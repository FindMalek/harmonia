import { task } from "@trigger.dev/sdk";

import { sendWaitlistConfirmationNotification } from "../../../services/email";

export const sendWaitlistConfirmationEmailTask = task({
	id: "email-send-waitlist-confirmation",
	retry: { maxAttempts: 2, minTimeoutInMs: 2000, factor: 2 },
	run: async ({ waitlistId, email }: { waitlistId: number; email: string }) => {
		const result = await sendWaitlistConfirmationNotification({
			waitlistId,
			email,
		});
		// Throw on transient failures so Trigger.dev's retry policy kicks in.
		// Terminal non-error outcomes (already_sent, suppressed) are not retried.
		if (
			result.reason === "send_failed" ||
			result.reason === "provider_not_configured"
		) {
			throw new Error(
				`Failed to send waitlist confirmation email: ${result.reason}`,
			);
		}
		return result;
	},
});
