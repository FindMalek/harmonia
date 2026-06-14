import {
	processResendWebhookEvent,
	verifyResendWebhookEvent,
} from "@harmonia/common/services/email";
import { apiEnv } from "@harmonia/env/presets/api";
import { logger } from "@harmonia/logger";
import { type NextRequest, NextResponse } from "next/server";

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

	if (!apiEnv.HARMONIA_RESEND_API_KEY) {
		logger.error("Missing HARMONIA_RESEND_API_KEY for webhook verification");
		return NextResponse.json(
			{ error: "API key is not configured" },
			{ status: 500 },
		);
	}
	const event = verifyResendWebhookEvent({
		apiKey: apiEnv.HARMONIA_RESEND_API_KEY,
		webhookSecret,
		payload,
		headers: { id, timestamp, signature },
	});

	if (!event) {
		logger.warn("Invalid or unparseable Resend webhook payload");
		return NextResponse.json(
			{ error: "Invalid webhook payload" },
			{ status: 400 },
		);
	}

	const result = await processResendWebhookEvent(event);

	logger.info(result, "Processed Resend webhook event");

	return NextResponse.json({ ok: true });
}
