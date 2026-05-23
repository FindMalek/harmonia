import { task } from "@trigger.dev/sdk";

import { sendFeedback3DayNotification } from "../../../services/email";

export const sendFeedback3DayEmailTask = task({
	id: "email-send-feedback-3day",
	retry: { maxAttempts: 2, minTimeoutInMs: 2000, factor: 2 },
	run: async ({
		userId,
		campaignKey,
	}: {
		userId: string;
		campaignKey: string;
	}) => {
		return await sendFeedback3DayNotification({ userId, campaignKey });
	},
});
