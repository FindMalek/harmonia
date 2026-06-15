import { task } from "@trigger.dev/sdk";

import { sendWaitlistConfirmationNotification } from "../../../services/email";

export const sendWaitlistConfirmationEmailTask = task({
	id: "email-send-waitlist-confirmation",
	retry: { maxAttempts: 2, minTimeoutInMs: 2000, factor: 2 },
	run: async ({ waitlistId, email }: { waitlistId: number; email: string }) => {
		return await sendWaitlistConfirmationNotification({ waitlistId, email });
	},
});
