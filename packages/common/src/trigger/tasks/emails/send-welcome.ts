import { task } from "@trigger.dev/sdk/v3";

import { sendWelcomeNotification } from "../../../services/email";

export const sendWelcomeEmailTask = task({
	id: "email-send-welcome",
	retry: { maxAttempts: 2, minTimeoutInMs: 2000, factor: 2 },
	run: async ({ userId }: { userId: string }) => {
		return await sendWelcomeNotification({ userId });
	},
});
