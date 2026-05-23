import { upsertEmailSuppression } from "@harmonia/common/services/email";
import { db } from "@harmonia/db";
import { emailSendLog } from "@harmonia/db/schema/email-send-log";
import { apiEnv } from "@harmonia/env/presets/api";
import { logger } from "@harmonia/logger";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
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
	const webhookSecret = apiEnv.HARMONIA_RESEND_WEBHOOK_SECRET;
	if (!webhookSecret) {
		logger.error(
			"Missing HARMONIA_RESEND_WEBHOOK_SECRET for webhook verification",
		);
		return NextResponse.json(
			{ error: "Webhook secret is not configured" },
			{ status: 500 },
		);
	}

	const payload = await req.text();
	const id = req.headers.get("svix-id");
	const timestamp = req.headers.get("svix-timestamp");
	const signature = req.headers.get("svix-signature");

	if (!id || !timestamp || !signature) {
		return NextResponse.json(
			{ error: "Missing svix headers" },
			{ status: 400 },
		);
	}

	const resend = new Resend(apiEnv.HARMONIA_RESEND_API_KEY ?? "");

	let verifiedPayload: unknown;
	try {
		verifiedPayload = resend.webhooks.verify({
			payload,
			headers: {
				id,
				timestamp,
				signature,
			},
			webhookSecret,
		});
	} catch (error) {
		logger.warn({ error }, "Invalid Resend webhook signature");
		return NextResponse.json(
			{ error: "Invalid webhook signature" },
			{ status: 401 },
		);
	}

	const parsed = resendWebhookSchema.safeParse(verifiedPayload);
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
