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

function getDashboardInviteUrl(rawToken: string): string | null {
	const dashboardUrl = env.NEXT_PUBLIC_HARMONIA_DASHBOARD_URL;
	if (!dashboardUrl) {
		return null;
	}
	return `${dashboardUrl}/api/invite/${rawToken}`;
}

function getDashboardWaitingUrl(email: string): string | null {
	const dashboardUrl = env.NEXT_PUBLIC_HARMONIA_DASHBOARD_URL;
	if (!dashboardUrl) {
		return null;
	}
	return `${dashboardUrl}/waiting?email=${encodeURIComponent(email)}`;
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

	const waitingUrl = getDashboardWaitingUrl(email);
	if (!waitingUrl) {
		logger.warn(
			{ waitlistId },
			"Skipping waitlist confirmation email because dashboard URL is not configured",
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
		props: { waitingUrl },
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
	const config = buildSendConfig();
	if (!config) {
		logger.warn(
			{ waitlistId },
			"Skipping waitlist approved email because email provider config is missing",
		);
		return { ok: false, reason: "provider_not_configured" as const };
	}

	// Fetch the invite token generated at approval time
	const [row] = await db
		.select({ inviteTokenRaw: waitlistSignup.inviteTokenRaw })
		.from(waitlistSignup)
		.where(eq(waitlistSignup.id, waitlistId));

	const rawToken = row?.inviteTokenRaw;
	if (!rawToken) {
		logger.warn(
			{ waitlistId },
			"Skipping waitlist approved email because invite token is missing — was the row approved via the admin panel?",
		);
		return { ok: false, reason: "token_missing" as const };
	}

	const inviteUrl = getDashboardInviteUrl(rawToken);
	if (!inviteUrl) {
		logger.warn(
			{ waitlistId },
			"Skipping waitlist approved email because dashboard URL is not configured",
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
		props: { loginUrl: inviteUrl },
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
		.set({
			approvalEmailSentAt: new Date(),
			inviteTokenRaw: null, // clear raw token now that it's in the email
		})
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
