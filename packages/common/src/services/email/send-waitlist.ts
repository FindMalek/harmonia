import { db } from "@harmonia/db";
import { waitlistSignup } from "@harmonia/db/schema/waitlist-signup";
import {
	sendWaitlistApprovedEmail,
	sendWaitlistConfirmationEmail,
} from "@harmonia/email/send";
import { env } from "@harmonia/env/server";
import { logger } from "@harmonia/logger";
import { eq } from "drizzle-orm";

import { markEmailDelivery, reserveEmailDelivery } from "./dedupe";
import { isEmailSuppressed } from "./policy";

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

function getDashboardLoginUrl(): string | null {
	const dashboardUrl = env.NEXT_PUBLIC_HARMONIA_DASHBOARD_URL;
	if (!dashboardUrl) {
		return null;
	}
	return `${dashboardUrl}/login`;
}

export async function sendWaitlistConfirmationNotification({
	waitlistId,
	email,
}: {
	waitlistId: number;
	email: string;
}) {
	const config = buildSendConfig();
	if (!config) {
		logger.warn(
			{ waitlistId },
			"Skipping waitlist confirmation email because email provider config is missing",
		);
		return { ok: false, reason: "provider_not_configured" as const };
	}

	if (await isEmailSuppressed(email)) {
		logger.info(
			{ waitlistId, templateKey: "waitlist_confirmation" },
			"Email delivery skipped",
		);
		return { ok: false, reason: "suppressed" as const };
	}

	const idempotencyKey = `waitlist-confirmation/${waitlistId}`;
	const reservation = await reserveEmailDelivery({
		userId: null,
		email,
		templateKey: "waitlist_confirmation",
		idempotencyKey,
		metadata: { waitlistId },
	});
	if (!reservation.created) {
		return { ok: true, reason: "already_sent" as const };
	}

	const result = await sendWaitlistConfirmationEmail({
		config,
		to: email,
		idempotencyKey,
		props: {},
	});

	if (!result.ok) {
		await markEmailDelivery({
			idempotencyKey,
			status: "failed",
			error: result.error,
		});
		logger.warn(
			{ waitlistId, templateKey: "waitlist_confirmation", error: result.error },
			"Email delivery failed",
		);
		return { ok: false, reason: "send_failed" as const, error: result.error };
	}

	await markEmailDelivery({
		idempotencyKey,
		status: "sent",
		providerMessageId: result.emailId,
	});
	await db
		.update(waitlistSignup)
		.set({ confirmationEmailSentAt: new Date() })
		.where(eq(waitlistSignup.id, waitlistId));

	logger.info(
		{
			waitlistId,
			templateKey: "waitlist_confirmation",
			providerMessageId: result.emailId,
		},
		"Email delivery sent",
	);
	return { ok: true, reason: "sent" as const };
}

export async function sendWaitlistApprovedNotification({
	waitlistId,
	email,
}: {
	waitlistId: number;
	email: string;
}) {
	const loginUrl = getDashboardLoginUrl();
	if (!loginUrl) {
		logger.warn(
			{ waitlistId },
			"Skipping waitlist approved email because dashboard URL is not configured",
		);
		return { ok: false, reason: "provider_not_configured" as const };
	}

	const config = buildSendConfig();
	if (!config) {
		logger.warn(
			{ waitlistId },
			"Skipping waitlist approved email because email provider config is missing",
		);
		return { ok: false, reason: "provider_not_configured" as const };
	}

	if (await isEmailSuppressed(email)) {
		logger.info(
			{ waitlistId, templateKey: "waitlist_approved" },
			"Email delivery skipped — address suppressed",
		);
		// Stamp so the poller stops retrying a suppressed address.
		await db
			.update(waitlistSignup)
			.set({ approvalEmailSentAt: new Date() })
			.where(eq(waitlistSignup.id, waitlistId));
		return { ok: false, reason: "suppressed" as const };
	}

	const idempotencyKey = `waitlist-approved/${waitlistId}`;
	const reservation = await reserveEmailDelivery({
		userId: null,
		email,
		templateKey: "waitlist_approved",
		idempotencyKey,
		metadata: { waitlistId },
	});
	if (!reservation.created) {
		// Already delivered in a prior run — stamp so the poller stops picking it up.
		await db
			.update(waitlistSignup)
			.set({ approvalEmailSentAt: new Date() })
			.where(eq(waitlistSignup.id, waitlistId));
		return { ok: true, reason: "already_sent" as const };
	}

	const result = await sendWaitlistApprovedEmail({
		config,
		to: email,
		idempotencyKey,
		props: { loginUrl },
	});

	if (!result.ok) {
		await markEmailDelivery({
			idempotencyKey,
			status: "failed",
			error: result.error,
		});
		logger.warn(
			{ waitlistId, templateKey: "waitlist_approved", error: result.error },
			"Email delivery failed",
		);
		// Do NOT stamp approvalEmailSentAt — let the poller retry.
		return { ok: false, reason: "send_failed" as const, error: result.error };
	}

	await markEmailDelivery({
		idempotencyKey,
		status: "sent",
		providerMessageId: result.emailId,
	});
	await db
		.update(waitlistSignup)
		.set({ approvalEmailSentAt: new Date() })
		.where(eq(waitlistSignup.id, waitlistId));

	logger.info(
		{
			waitlistId,
			templateKey: "waitlist_approved",
			providerMessageId: result.emailId,
		},
		"Email delivery sent",
	);
	return { ok: true, reason: "sent" as const };
}
