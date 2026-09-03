import { task } from "@trigger.dev/sdk";

import { sendAllowlistAutomationFailedNotification } from "../../../services/email";

export const sendAllowlistAutomationFailedEmailTask = task({
	id: "email-send-spotify-allowlist-failed",
	retry: { maxAttempts: 2, minTimeoutInMs: 2000, factor: 2 },
	run: async ({
		targetEmail,
		action,
		errorMessage,
	}: {
		targetEmail: string;
		action: "add" | "remove";
		errorMessage: string;
	}) => {
		return await sendAllowlistAutomationFailedNotification({
			targetEmail,
			action,
			errorMessage,
		});
	},
});
