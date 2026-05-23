import { db } from "@harmonia/db";
import { user } from "@harmonia/db/schema/auth";
import { sendMarketingFeatureUpdateEmail } from "@harmonia/emails/send";
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

export async function sendMarketingFeatureUpdate({
	userId,
	featureTitle,
	featureSummary,
	campaignKey,
}: {
	userId: string;
	featureTitle: string;
	featureSummary: string;
	campaignKey: string;
}) {
	const config = buildSendConfig();
	if (!config) return { ok: false, reason: "provider_not_configured" as const };

	const [userRow] = await db
		.select({ email: user.email, name: user.name })
		.from(user)
		.where(eq(user.id, userId));

	if (!userRow?.email) return { ok: false, reason: "missing_email" as const };

	const idempotencyKey = `marketing-feature-update/${campaignKey}/${userId}`;
	const policy = await evaluateEmailPolicy({
		userId,
		email: userRow.email,
		templateKey: "marketing_feature_update",
	});
	if (!policy.allowed) {
		await reserveEmailDelivery({
			userId,
			email: userRow.email,
			templateKey: "marketing_feature_update",
			idempotencyKey,
			metadata: { campaignKey, policyReason: policy.reason },
		});
		await markEmailDelivery({
			idempotencyKey,
			status: "skipped",
			skipReason: policy.reason,
		});
		logger.info(
			{
				userId,
				templateKey: "marketing_feature_update",
				reason: policy.reason,
				campaignKey,
			},
			"Email delivery skipped",
		);
		return { ok: false, reason: policy.reason };
	}

	const reservation = await reserveEmailDelivery({
		userId,
		email: userRow.email,
		templateKey: "marketing_feature_update",
		idempotencyKey,
		metadata: { campaignKey, featureTitle },
	});
	if (!reservation.created)
		return { ok: true, reason: "already_sent" as const };

	const preferencesUrl =
		env.NEXT_PUBLIC_HARMONIA_EMAIL_PREFERENCES_URL ??
		`${getDashboardUrl()}/settings`;
	const unsubscribeUrl = `${preferencesUrl}?unsubscribe=all`;

	const result = await sendMarketingFeatureUpdateEmail({
		config,
		to: userRow.email,
		idempotencyKey,
		listUnsubscribeUrl: unsubscribeUrl,
		props: {
			featureTitle,
			featureSummary,
			recipientName: userRow.name,
			ctaUrl: `${getDashboardUrl()}/playlists`,
			preferencesUrl,
			unsubscribeUrl,
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
				templateKey: "marketing_feature_update",
				campaignKey,
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
			templateKey: "marketing_feature_update",
			campaignKey,
			providerMessageId: result.emailId,
		},
		"Email delivery sent",
	);

	return { ok: true, reason: "sent" as const };
}
