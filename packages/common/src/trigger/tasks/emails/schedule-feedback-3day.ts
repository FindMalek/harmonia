import { task, wait } from "@trigger.dev/sdk";

import { sendFeedback3DayEmailTask } from "./send-feedback-3day";

export const scheduleFeedback3DayEmailTask = task({
	id: "email-schedule-feedback-3day",
	retry: { maxAttempts: 2, minTimeoutInMs: 2000, factor: 2 },
	run: async ({
		userId,
		campaignKey,
	}: {
		userId: string;
		campaignKey: string;
	}) => {
		await wait.for({ days: 3 });
		return await sendFeedback3DayEmailTask.trigger({
			userId,
			campaignKey,
		});
	},
});
