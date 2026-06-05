import { task } from "@trigger.dev/sdk";

import { sendPaymentFailedNotification } from "../../../services/email";

export const sendPaymentFailedEmailTask = task({
	id: "email-send-payment-failed",
	retry: { maxAttempts: 2, minTimeoutInMs: 2000, factor: 2 },
	run: async (payload: {
		userId: string;
		invoiceNumber: string;
		amount: string;
		attemptDate: string;
		retryDate?: string | null;
	}) => {
		return await sendPaymentFailedNotification(payload);
	},
});
