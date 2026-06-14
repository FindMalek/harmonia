import { task } from "@trigger.dev/sdk";

import { sendInvoiceNotification } from "../../../services/email";

export const sendInvoiceEmailTask = task({
	id: "email-send-invoice",
	retry: { maxAttempts: 2, minTimeoutInMs: 2000, factor: 2 },
	run: async (payload: {
		userId: string;
		invoiceNumber: string;
		invoiceDate: string;
		amount: string;
		planName: string;
		billingPeriod: string;
		subtotal?: string | null;
		tax?: string | null;
		paymentMethod?: string | null;
		lineItems?: Array<{
			description: string;
			quantity?: number | null;
			unitPrice: string;
			total: string;
		}> | null;
		downloadUrl?: string | null;
	}) => {
		return await sendInvoiceNotification(payload);
	},
});
