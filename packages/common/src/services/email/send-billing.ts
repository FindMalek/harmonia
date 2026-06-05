import { db } from "@harmonia/db";
import { user } from "@harmonia/db/schema/auth";
import {
	sendInvoiceEmail,
	sendPaymentFailedEmail,
	sendSubscriptionActivatedEmail,
	sendSubscriptionCanceledEmail,
	sendSubscriptionRenewalReminderEmail,
} from "@harmonia/email/send";
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

export async function sendSubscriptionActivatedNotification({
	userId,
	planName,
	billingCycleLabel,
	amount,
	nextBillingDate,
	externalSubscriptionId,
}: {
	userId: string;
	planName: string;
	billingCycleLabel: string;
	amount: string;
	nextBillingDate: string;
	externalSubscriptionId: string;
}) {
	const config = buildSendConfig();
	if (!config) return { ok: false, reason: "provider_not_configured" as const };

	const userRow = await getUserForEmail(userId);
	if (!userRow?.email) return { ok: false, reason: "missing_email" as const };

	const idempotencyKey = `subscription-activated/${externalSubscriptionId}`;
	const policy = await evaluateEmailPolicy({
		userId,
		email: userRow.email,
		templateKey: "subscription_activated",
	});
	if (!policy.allowed) {
		await reserveEmailDelivery({
			userId,
			email: userRow.email,
			templateKey: "subscription_activated",
			idempotencyKey,
			metadata: { externalSubscriptionId, policyReason: policy.reason },
		});
		await markEmailDelivery({
			idempotencyKey,
			status: "skipped",
			skipReason: policy.reason,
		});
		logger.info(
			{
				userId,
				templateKey: "subscription_activated",
				reason: policy.reason,
			},
			"Email delivery skipped",
		);
		return { ok: false, reason: policy.reason };
	}

	const reservation = await reserveEmailDelivery({
		userId,
		email: userRow.email,
		templateKey: "subscription_activated",
		idempotencyKey,
		metadata: { externalSubscriptionId, planName },
	});
	if (!reservation.created)
		return { ok: true, reason: "already_sent" as const };

	const dashboardUrl = getDashboardUrl();
	const result = await sendSubscriptionActivatedEmail({
		config,
		to: userRow.email,
		idempotencyKey,
		props: {
			recipientName: userRow.name,
			planName,
			billingCycleLabel,
			amount,
			nextBillingDate,
			dashboardUrl,
			manageSubscriptionUrl: `${dashboardUrl}/settings/billing`,
		},
	});

	if (!result.ok) {
		await markEmailDelivery({
			idempotencyKey,
			status: "failed",
			error: result.error,
		});
		logger.warn(
			{
				userId,
				templateKey: "subscription_activated",
				error: result.error,
			},
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
		{
			userId,
			templateKey: "subscription_activated",
			providerMessageId: result.emailId,
		},
		"Email delivery sent",
	);
	return { ok: true, reason: "sent" as const };
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

export async function sendPaymentFailedNotification({
	userId,
	invoiceNumber,
	amount,
	attemptDate,
	retryDate,
}: {
	userId: string;
	invoiceNumber: string;
	amount: string;
	attemptDate: string;
	retryDate?: string | null;
}) {
	const config = buildSendConfig();
	if (!config) return { ok: false, reason: "provider_not_configured" as const };

	const userRow = await getUserForEmail(userId);
	if (!userRow?.email) return { ok: false, reason: "missing_email" as const };

	const idempotencyKey = `payment-failed/${invoiceNumber}`;
	const policy = await evaluateEmailPolicy({
		userId,
		email: userRow.email,
		templateKey: "payment_failed",
	});
	if (!policy.allowed) {
		await reserveEmailDelivery({
			userId,
			email: userRow.email,
			templateKey: "payment_failed",
			idempotencyKey,
			metadata: { invoiceNumber, policyReason: policy.reason },
		});
		await markEmailDelivery({
			idempotencyKey,
			status: "skipped",
			skipReason: policy.reason,
		});
		logger.info(
			{ userId, templateKey: "payment_failed", reason: policy.reason },
			"Email delivery skipped",
		);
		return { ok: false, reason: policy.reason };
	}

	const reservation = await reserveEmailDelivery({
		userId,
		email: userRow.email,
		templateKey: "payment_failed",
		idempotencyKey,
		metadata: { invoiceNumber, amount },
	});
	if (!reservation.created)
		return { ok: true, reason: "already_sent" as const };

	const dashboardUrl = getDashboardUrl();
	const result = await sendPaymentFailedEmail({
		config,
		to: userRow.email,
		idempotencyKey,
		props: {
			recipientName: userRow.name,
			amount,
			attemptDate,
			retryDate,
			updatePaymentUrl: `${dashboardUrl}/settings/billing`,
			dashboardUrl,
		},
	});

	if (!result.ok) {
		await markEmailDelivery({
			idempotencyKey,
			status: "failed",
			error: result.error,
		});
		logger.warn(
			{ userId, templateKey: "payment_failed", error: result.error },
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
		{
			userId,
			templateKey: "payment_failed",
			providerMessageId: result.emailId,
		},
		"Email delivery sent",
	);
	return { ok: true, reason: "sent" as const };
}

export async function sendSubscriptionRenewalReminderNotification({
	userId,
	planName,
	renewalDate,
	amount,
}: {
	userId: string;
	planName: string;
	renewalDate: string;
	amount: string;
}) {
	const config = buildSendConfig();
	if (!config) return { ok: false, reason: "provider_not_configured" as const };

	const userRow = await getUserForEmail(userId);
	if (!userRow?.email) return { ok: false, reason: "missing_email" as const };

	const idempotencyKey = `subscription-renewal-reminder/${userId}/${renewalDate}`;
	const policy = await evaluateEmailPolicy({
		userId,
		email: userRow.email,
		templateKey: "subscription_renewal_reminder",
	});
	if (!policy.allowed) {
		await reserveEmailDelivery({
			userId,
			email: userRow.email,
			templateKey: "subscription_renewal_reminder",
			idempotencyKey,
			metadata: { renewalDate, policyReason: policy.reason },
		});
		await markEmailDelivery({
			idempotencyKey,
			status: "skipped",
			skipReason: policy.reason,
		});
		logger.info(
			{
				userId,
				templateKey: "subscription_renewal_reminder",
				reason: policy.reason,
			},
			"Email delivery skipped",
		);
		return { ok: false, reason: policy.reason };
	}

	const reservation = await reserveEmailDelivery({
		userId,
		email: userRow.email,
		templateKey: "subscription_renewal_reminder",
		idempotencyKey,
		metadata: { renewalDate, planName },
	});
	if (!reservation.created)
		return { ok: true, reason: "already_sent" as const };

	const dashboardUrl = getDashboardUrl();
	const result = await sendSubscriptionRenewalReminderEmail({
		config,
		to: userRow.email,
		idempotencyKey,
		props: {
			recipientName: userRow.name,
			planName,
			renewalDate,
			amount,
			manageSubscriptionUrl: `${dashboardUrl}/settings/billing`,
			dashboardUrl,
		},
	});

	if (!result.ok) {
		await markEmailDelivery({
			idempotencyKey,
			status: "failed",
			error: result.error,
		});
		logger.warn(
			{
				userId,
				templateKey: "subscription_renewal_reminder",
				error: result.error,
			},
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
		{
			userId,
			templateKey: "subscription_renewal_reminder",
			providerMessageId: result.emailId,
		},
		"Email delivery sent",
	);
	return { ok: true, reason: "sent" as const };
}

export async function sendSubscriptionCanceledNotification({
	userId,
	planName,
	canceledAt,
	accessUntil,
	externalSubscriptionId,
}: {
	userId: string;
	planName: string;
	canceledAt: string;
	accessUntil: string;
	externalSubscriptionId: string;
}) {
	const config = buildSendConfig();
	if (!config) return { ok: false, reason: "provider_not_configured" as const };

	const userRow = await getUserForEmail(userId);
	if (!userRow?.email) return { ok: false, reason: "missing_email" as const };

	const idempotencyKey = `subscription-canceled/${externalSubscriptionId}`;
	const policy = await evaluateEmailPolicy({
		userId,
		email: userRow.email,
		templateKey: "subscription_canceled",
	});
	if (!policy.allowed) {
		await reserveEmailDelivery({
			userId,
			email: userRow.email,
			templateKey: "subscription_canceled",
			idempotencyKey,
			metadata: { externalSubscriptionId, policyReason: policy.reason },
		});
		await markEmailDelivery({
			idempotencyKey,
			status: "skipped",
			skipReason: policy.reason,
		});
		logger.info(
			{
				userId,
				templateKey: "subscription_canceled",
				reason: policy.reason,
			},
			"Email delivery skipped",
		);
		return { ok: false, reason: policy.reason };
	}

	const reservation = await reserveEmailDelivery({
		userId,
		email: userRow.email,
		templateKey: "subscription_canceled",
		idempotencyKey,
		metadata: { externalSubscriptionId, planName },
	});
	if (!reservation.created)
		return { ok: true, reason: "already_sent" as const };

	const dashboardUrl = getDashboardUrl();
	const result = await sendSubscriptionCanceledEmail({
		config,
		to: userRow.email,
		idempotencyKey,
		props: {
			recipientName: userRow.name,
			planName,
			canceledAt,
			accessUntil,
			resubscribeUrl: `${dashboardUrl}/settings/billing`,
			dashboardUrl,
		},
	});

	if (!result.ok) {
		await markEmailDelivery({
			idempotencyKey,
			status: "failed",
			error: result.error,
		});
		logger.warn(
			{
				userId,
				templateKey: "subscription_canceled",
				error: result.error,
			},
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
		{
			userId,
			templateKey: "subscription_canceled",
			providerMessageId: result.emailId,
		},
		"Email delivery sent",
	);
	return { ok: true, reason: "sent" as const };
}
