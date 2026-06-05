import { task } from "@trigger.dev/sdk";

import { sendSubscriptionCanceledNotification } from "../../../services/email";

export const sendSubscriptionCanceledEmailTask = task({
	id: "email-send-subscription-canceled",
	retry: { maxAttempts: 2, minTimeoutInMs: 2000, factor: 2 },
	run: async (payload: {
		userId: string;
		planName: string;
		canceledAt: string;
		accessUntil: string;
		externalSubscriptionId: string;
	}) => {
		return await sendSubscriptionCanceledNotification(payload);
	},
});
