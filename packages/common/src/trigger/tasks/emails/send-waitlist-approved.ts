import { task } from "@trigger.dev/sdk";

import { sendWaitlistApprovedNotification } from "../../../services/email";

export const sendWaitlistApprovedEmailTask = task({
	id: "email-send-waitlist-approved",
	retry: { maxAttempts: 2, minTimeoutInMs: 2000, factor: 2 },
	run: async ({ waitlistId, email }: { waitlistId: number; email: string }) => {
		const result = await sendWaitlistApprovedNotification({
			waitlistId,
			email,
		});
		// Throw on transient failures so Trigger.dev's retry policy kicks in.
		// Terminal non-error outcomes (already_sent, suppressed) are not retried.
		if (
			result.reason === "send_failed" ||
			result.reason === "provider_not_configured" ||
			result.reason === "token_missing"
		) {
			throw new Error(
				`Failed to send waitlist approved email: ${result.reason}`,
			);
		}
		return result;
	},
});
