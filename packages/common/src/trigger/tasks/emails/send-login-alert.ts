import { task } from "@trigger.dev/sdk";

import { sendLoginAlertNotification } from "../../../services/email";

export const sendLoginAlertEmailTask = task({
	id: "email-send-login-alert",
	retry: { maxAttempts: 2, minTimeoutInMs: 2000, factor: 2 },
	run: async ({
		userId,
		loginAtIso,
		ipAddress,
		userAgent,
	}: {
		userId: string;
		loginAtIso: string;
		ipAddress?: string | null;
		userAgent?: string | null;
	}) => {
		return await sendLoginAlertNotification({
			userId,
			loginAtIso,
			ipAddress,
			userAgent,
		});
	},
});
