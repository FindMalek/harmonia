import { task } from "@trigger.dev/sdk";

import { sendSubscriptionActivatedNotification } from "../../../services/email";

export const sendSubscriptionActivatedEmailTask = task({
	id: "email-send-subscription-activated",
	retry: { maxAttempts: 2, minTimeoutInMs: 2000, factor: 2 },
	run: async (payload: {
		userId: string;
		planName: string;
		billingCycleLabel: string;
		amount: string;
		nextBillingDate: string;
		externalSubscriptionId: string;
	}) => {
		return await sendSubscriptionActivatedNotification(payload);
	},
});
