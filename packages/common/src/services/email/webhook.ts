import { db, eq } from "@harmonia/db";
import { emailSendLog } from "@harmonia/db/schema/email-send-log";
import { Resend } from "resend";
import { z } from "zod";

import { upsertEmailSuppression } from "./policy";

const resendWebhookEventSchema = z.object({
	type: z.string(),
	data: z.object({
		email_id: z.string().optional(),
		to: z.array(z.string()).optional(),
		bounce: z
			.object({
				message: z.string().optional(),
			})
			.optional(),
	}),
});

export type ResendWebhookEvent = z.infer<typeof resendWebhookEventSchema>;

export function verifyResendWebhookEvent({
	apiKey,
	webhookSecret,
	payload,
	headers,
}: {
	apiKey: string;
	webhookSecret: string;
	payload: string;
	headers: { id: string; timestamp: string; signature: string };
}): ResendWebhookEvent | null {
	const resend = new Resend(apiKey);

	let verifiedPayload: unknown;
	try {
		verifiedPayload = resend.webhooks.verify({
			payload,
			headers,
			webhookSecret,
		});
	} catch {
		return null;
	}

	const parsed = resendWebhookEventSchema.safeParse(verifiedPayload);
	return parsed.success ? parsed.data : null;
}

export async function processResendWebhookEvent(event: ResendWebhookEvent) {
	const { type, data } = event;
	const providerMessageId = data.email_id;
	const recipientEmail = data.to?.[0]?.toLowerCase();

	if (providerMessageId) {
		if (type === "email.delivered") {
			await db
				.update(emailSendLog)
				.set({ status: "sent", sentAt: new Date() })
				.where(eq(emailSendLog.providerMessageId, providerMessageId));
		}

		if (type === "email.failed") {
			await db
				.update(emailSendLog)
				.set({ status: "failed", error: "Provider send failed" })
				.where(eq(emailSendLog.providerMessageId, providerMessageId));
		}
	}

	if (recipientEmail && type === "email.bounced") {
		await upsertEmailSuppression({
			email: recipientEmail,
			reason: data.bounce?.message ?? "bounced",
			source: "resend_webhook",
		});
	}

	if (recipientEmail && type === "email.complained") {
		await upsertEmailSuppression({
			email: recipientEmail,
			reason: "complained",
			source: "resend_webhook",
		});
	}

	return { eventType: type, providerMessageId, recipientEmail };
}
