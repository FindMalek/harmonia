import { db } from "@harmonia/db";
import { user } from "@harmonia/db/schema/auth";
import { sendInvoiceEmail } from "@harmonia/email/send";
import { env } from "@harmonia/env/server";
import { logger } from "@harmonia/logger";
import { eq } from "drizzle-orm";

import { markEmailDelivery, reserveEmailDelivery } from "./dedupe";
import { evaluateEmailPolicy } from "./policy";

function buildSendConfig() {
	if (!env.HARMONIA_RESEND_API_KEY || !env.HARMONIA_EMAIL_FROM) {
		return null;
	}

	return {
		apiKey: env.HARMONIA_RESEND_API_KEY,
		from: env.HARMONIA_EMAIL_FROM,
		replyTo: env.HARMONIA_EMAIL_REPLY_TO,
	};
}

function getDashboardUrl() {
	return (
		env.NEXT_PUBLIC_HARMONIA_DASHBOARD_URL ?? env.NEXT_PUBLIC_HARMONIA_API_URL
	);
}

async function getUserForEmail(userId: string) {
	const [userRow] = await db
		.select({ id: user.id, name: user.name, email: user.email })
		.from(user)
		.where(eq(user.id, userId));

	return userRow ?? null;
}

export async function sendInvoiceNotification({
	userId,
	invoiceNumber,
	invoiceDate,
	amount,
	planName,
	billingPeriod,
	subtotal,
	tax,
	paymentMethod,
	lineItems,
	downloadUrl,
}: {
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
}) {
	const config = buildSendConfig();
	if (!config) return { ok: false, reason: "provider_not_configured" as const };

	const userRow = await getUserForEmail(userId);
	if (!userRow?.email) return { ok: false, reason: "missing_email" as const };

	const idempotencyKey = `invoice/${invoiceNumber}`;
	const policy = await evaluateEmailPolicy({
		userId,
		email: userRow.email,
		templateKey: "invoice",
	});
	if (!policy.allowed) {
		await reserveEmailDelivery({
			userId,
			email: userRow.email,
			templateKey: "invoice",
			idempotencyKey,
			metadata: { invoiceNumber, policyReason: policy.reason },
		});
		await markEmailDelivery({
			idempotencyKey,
			status: "skipped",
			skipReason: policy.reason,
		});
		logger.info(
			{ userId, templateKey: "invoice", reason: policy.reason },
			"Email delivery skipped",
		);
		return { ok: false, reason: policy.reason };
	}

	const reservation = await reserveEmailDelivery({
		userId,
		email: userRow.email,
		templateKey: "invoice",
		idempotencyKey,
		metadata: { invoiceNumber, amount },
	});
	if (!reservation.created)
		return { ok: true, reason: "already_sent" as const };

	const result = await sendInvoiceEmail({
		config,
		to: userRow.email,
		idempotencyKey,
		props: {
			recipientName: userRow.name,
			recipientEmail: userRow.email,
			invoiceNumber,
			invoiceDate,
			amount,
			planName,
			billingPeriod,
			subtotal,
			tax,
			paymentMethod,
			lineItems,
			downloadUrl,
			dashboardUrl: getDashboardUrl(),
		},
	});

	if (!result.ok) {
		await markEmailDelivery({
			idempotencyKey,
			status: "failed",
			error: result.error,
		});
		logger.warn(
			{ userId, templateKey: "invoice", error: result.error },
			"Email delivery failed",
		);
		return { ok: false, reason: "send_failed" as const, error: result.error };
	}

	await markEmailDelivery({
		idempotencyKey,
		status: "sent",
		providerMessageId: result.emailId,
	});
	logger.info(
		{ userId, templateKey: "invoice", providerMessageId: result.emailId },
		"Email delivery sent",
	);
	return { ok: true, reason: "sent" as const };
}
