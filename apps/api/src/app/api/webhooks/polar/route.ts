import * as crypto from "node:crypto";
import { db } from "@harmonia/db";
import { user } from "@harmonia/db/schema/auth";
import { apiEnv } from "@harmonia/env/presets/api";
import { logger } from "@harmonia/logger";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
	const webhookSecret = apiEnv.POLAR_WEBHOOK_SECRET;
	if (!webhookSecret) {
		logger.error("POLAR_WEBHOOK_SECRET is not configured", "PolarWebhook");
		return new Response("Webhook secret not configured", { status: 500 });
	}

	const id = req.headers.get("webhook-id");
	const timestamp = req.headers.get("webhook-timestamp");
	const signature = req.headers.get("webhook-signature");

	if (!id || !timestamp || !signature) {
		logger.warn("Missing required webhook headers", "PolarWebhook");
		return new Response("Missing headers", { status: 400 });
	}

	// Protect against replay attacks (5 minute window)
	const parsedTimestamp = Number.parseInt(timestamp, 10);
	if (Number.isNaN(parsedTimestamp)) {
		return new Response("Invalid timestamp", { status: 400 });
	}
	const now = Math.floor(Date.now() / 1000);
	if (Math.abs(now - parsedTimestamp) > 300) {
		logger.warn("Webhook timestamp out of window", "PolarWebhook");
		return new Response("Timestamp out of window", { status: 400 });
	}

	// Consume body stream as text before parsing
	const rawBody = await req.text();

	const signedContent = `${id}.${timestamp}.${rawBody}`;

	// Strip "whsec_" prefix if present and base64 decode the secret key
	const secretKey = webhookSecret.startsWith("whsec_")
		? webhookSecret.substring(6)
		: webhookSecret;
	const secretBuffer = Buffer.from(secretKey, "base64");

	const hmac = crypto.createHmac("sha256", secretBuffer);
	hmac.update(signedContent);
	const expectedSignature = hmac.digest("base64");

	// Signature header can contain multiple space-separated signatures
	const passedSignatures = signature
		.split(" ")
		.map((sig) => {
			const parts = sig.split(",");
			if (parts.length === 2 && parts[0] === "v1") {
				return parts[1];
			}
			return null;
		})
		.filter(Boolean);

	let isSignatureValid = false;
	const expectedBuffer = Buffer.from(expectedSignature, "base64");

	for (const passedSig of passedSignatures) {
		if (!passedSig) continue;
		const passedBuffer = Buffer.from(passedSig, "base64");
		if (
			passedBuffer.length === expectedBuffer.length &&
			crypto.timingSafeEqual(passedBuffer, expectedBuffer)
		) {
			isSignatureValid = true;
			break;
		}
	}

	if (!isSignatureValid) {
		logger.warn("Invalid webhook signature", "PolarWebhook");
		return new Response("Invalid signature", { status: 401 });
	}

	interface PolarWebhookPayload {
		event?: string;
		data?: {
			id?: string;
			customerId?: string;
			currentPeriodEnd?: string | number | Date;
			cancelAt?: string | number | Date;
			user?: {
				email?: string;
			};
		};
	}

	let payload: PolarWebhookPayload;
	try {
		payload = JSON.parse(rawBody) as PolarWebhookPayload;
	} catch (_err) {
		return new Response("Invalid JSON payload", { status: 400 });
	}

	const { event, data } = payload;
	if (!event || !data) {
		return new Response("Missing event or data fields", { status: 400 });
	}

	logger.info(`Received Polar webhook event: ${event}`, "PolarWebhook");

	const email = data.user?.email;
	if (!email) {
		logger.warn(
			`No user email in webhook data for event: ${event}`,
			"PolarWebhook",
		);
		return new Response("No user email in payload", { status: 200 });
	}

	const normalizedEmail = email.toLowerCase();

	try {
		if (event === "subscription.created") {
			await db
				.update(user)
				.set({
					plan: "pro",
					planExpiresAt: null,
					polarCustomerId: data.customerId || null,
					polarSubscriptionId: data.id || null,
				})
				.where(eq(user.email, normalizedEmail));
			logger.info(
				`Upgraded user ${normalizedEmail} to Pro plan`,
				"PolarWebhook",
			);
		} else if (event === "subscription.updated") {
			const planExpiresAt = data.currentPeriodEnd
				? new Date(data.currentPeriodEnd)
				: null;
			await db
				.update(user)
				.set({
					plan: "pro",
					planExpiresAt,
					polarCustomerId: data.customerId || null,
					polarSubscriptionId: data.id || null,
				})
				.where(eq(user.email, normalizedEmail));
			logger.info(
				`Updated subscription for user ${normalizedEmail}`,
				"PolarWebhook",
			);
		} else if (event === "subscription.canceled") {
			const planExpiresAt = data.cancelAt
				? new Date(data.cancelAt)
				: data.currentPeriodEnd
					? new Date(data.currentPeriodEnd)
					: new Date();
			await db
				.update(user)
				.set({
					plan: "free",
					planExpiresAt,
					polarCustomerId: data.customerId || null,
					polarSubscriptionId: data.id || null,
				})
				.where(eq(user.email, normalizedEmail));
			logger.info(
				`Canceled subscription for user ${normalizedEmail}. Expires at: ${planExpiresAt}`,
				"PolarWebhook",
			);
		} else if (event === "subscription.revoked") {
			await db
				.update(user)
				.set({
					plan: "free",
					planExpiresAt: new Date(),
					polarCustomerId: data.customerId || null,
					polarSubscriptionId: data.id || null,
				})
				.where(eq(user.email, normalizedEmail));
			logger.info(
				`Revoked subscription for user ${normalizedEmail}`,
				"PolarWebhook",
			);
		} else {
			logger.info(`Unhandled Polar webhook event: ${event}`, "PolarWebhook");
		}

		return new Response("OK", { status: 200 });
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : String(err);
		logger.error(
			`Database error processing webhook: ${errorMessage}`,
			"PolarWebhook",
		);
		return new Response("Internal Server Error", { status: 500 });
	}
}
