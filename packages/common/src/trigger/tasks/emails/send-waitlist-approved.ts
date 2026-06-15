import { task } from "@trigger.dev/sdk";

import { sendWaitlistApprovedNotification } from "../../../services/email";

export const sendWaitlistApprovedEmailTask = task({
	id: "email-send-waitlist-approved",
	retry: { maxAttempts: 2, minTimeoutInMs: 2000, factor: 2 },
	run: async ({ waitlistId, email }: { waitlistId: number; email: string }) => {
		return await sendWaitlistApprovedNotification({ waitlistId, email });
	},
});
