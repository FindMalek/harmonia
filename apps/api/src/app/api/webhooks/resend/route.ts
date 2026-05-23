import { upsertEmailSuppression } from "@harmonia/common/services/email";
import { db } from "@harmonia/db";
import { emailSendLog } from "@harmonia/db/schema/email-send-log";
import { apiEnv } from "@harmonia/env/presets/api";
import { logger } from "@harmonia/logger";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const resendWebhookSchema = z.object({
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

export async function POST(req: NextRequest) {
	const secret = apiEnv.HARMONIA_RESEND_WEBHOOK_SECRET;
	if (secret) {
		const receivedSecret = req.headers.get("x-resend-signature");
		if (!receivedSecret || receivedSecret !== secret) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
	}

	const json = await req.json();
	const parsed = resendWebhookSchema.safeParse(json);
	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
	}

	const { type, data } = parsed.data;
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

	logger.info(
		{ eventType: type, providerMessageId, recipientEmail },
		"Processed Resend webhook event",
	);

	return NextResponse.json({ ok: true });
}
