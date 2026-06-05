import { task } from "@trigger.dev/sdk";

import { sendSubscriptionRenewalReminderNotification } from "../../../services/email";

export const sendSubscriptionRenewalReminderEmailTask = task({
	id: "email-send-subscription-renewal-reminder",
	retry: { maxAttempts: 2, minTimeoutInMs: 2000, factor: 2 },
	run: async (payload: {
		userId: string;
		planName: string;
		renewalDate: string;
		amount: string;
	}) => {
		return await sendSubscriptionRenewalReminderNotification(payload);
	},
});
