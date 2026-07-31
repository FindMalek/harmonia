import type { CreatedPlaylist } from "@harmonia/common/schemas";
import { DASHBOARD_ROUTES } from "@harmonia/common/utils/routes";
import { db } from "@harmonia/db";
import { user } from "@harmonia/db/schema/auth";
import { playlist } from "@harmonia/db/schema/playlist";
import {
	sendFeedback3DayEmail,
	sendOrganizeCompleteEmail,
	sendOrganizeWeeklyDigestEmail,
	sendWelcomeEmail,
} from "@harmonia/email/send";
import { env } from "@harmonia/env/server";
import { logger } from "@harmonia/logger";
import { and, desc, eq } from "drizzle-orm";

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
		.select({
			id: user.id,
			name: user.name,
			email: user.email,
		})
		.from(user)
		.where(eq(user.id, userId));

	return userRow ?? null;
}

export async function sendOrganizeCompleteNotification({
	userId,
	runId,
	playlistsCreated,
	tracksOrganized,
}: {
	userId: string;
	runId: number;
	playlistsCreated: number;
	tracksOrganized: number;
}) {
	const config = buildSendConfig();
	if (!config) {
		logger.warn(
			{ userId, runId },
			"Skipping organize completion email because email provider config is missing",
		);
		return { ok: false, reason: "provider_not_configured" as const };
	}

	const userRow = await getUserForEmail(userId);
	if (!userRow) {
		return { ok: false, reason: "user_not_found" as const };
	}

	const idempotencyKey = `organize-complete/${runId}`;
	const policy = await evaluateEmailPolicy({
		userId,
		email: userRow.email,
		templateKey: "organize_complete",
	});
	if (!policy.allowed || !userRow.email) {
		await reserveEmailDelivery({
			userId,
			email: userRow.email ?? "unknown",
			templateKey: "organize_complete",
			idempotencyKey,
			metadata: { runId, policyReason: policy.reason },
		});
		await markEmailDelivery({
			idempotencyKey,
			status: "skipped",
			skipReason: policy.reason,
		});
		logger.info(
			{
				userId,
				runId,
				templateKey: "organize_complete",
				reason: policy.reason,
			},
			"Email delivery skipped",
		);
		return { ok: false, reason: policy.reason };
	}

	const reservation = await reserveEmailDelivery({
		userId,
		email: userRow.email,
		templateKey: "organize_complete",
		idempotencyKey,
		metadata: { runId, playlistsCreated, tracksOrganized },
	});
	if (!reservation.created) {
		return { ok: true, reason: "already_sent" as const };
	}

	const result = await sendOrganizeCompleteEmail({
		config,
		to: userRow.email,
		idempotencyKey,
		props: {
			dashboardPlaylistsUrl: `${getDashboardUrl()}${DASHBOARD_ROUTES.playlists.path}`,
			recipientName: userRow.name,
			topPlaylists: await getRecentGeneratedPlaylists(userId),
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
				runId,
				templateKey: "organize_complete",
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
			runId,
			templateKey: "organize_complete",
			providerMessageId: result.emailId,
		},
		"Email delivery sent",
	);

	return { ok: true, reason: "sent" as const };
}

export async function sendOrganizeWeeklyDigestNotification({
	userId,
	runId,
	createdPlaylists,
	updatedPlaylists,
	tracksOrganized,
}: {
	userId: string;
	runId: number;
	createdPlaylists: CreatedPlaylist[];
	updatedPlaylists: number;
	tracksOrganized: number;
}) {
	const config = buildSendConfig();
	if (!config) {
		logger.warn(
			{ userId, runId },
			"Skipping weekly digest email because email provider config is missing",
		);
		return { ok: false, reason: "provider_not_configured" as const };
	}

	const userRow = await getUserForEmail(userId);
	if (!userRow) {
		return { ok: false, reason: "user_not_found" as const };
	}

	const idempotencyKey = `organize-weekly-digest/${runId}`;
	const policy = await evaluateEmailPolicy({
		userId,
		email: userRow.email,
		templateKey: "organize_weekly_digest",
	});
	if (!policy.allowed || !userRow.email) {
		await reserveEmailDelivery({
			userId,
			email: userRow.email ?? "unknown",
			templateKey: "organize_weekly_digest",
			idempotencyKey,
			metadata: { runId, policyReason: policy.reason },
		});
		await markEmailDelivery({
			idempotencyKey,
			status: "skipped",
			skipReason: policy.reason,
		});
		logger.info(
			{
				userId,
				runId,
				templateKey: "organize_weekly_digest",
				reason: policy.reason,
			},
			"Email delivery skipped",
		);
		return { ok: false, reason: policy.reason };
	}

	const reservation = await reserveEmailDelivery({
		userId,
		email: userRow.email,
		templateKey: "organize_weekly_digest",
		idempotencyKey,
		metadata: {
			runId,
			createdCount: createdPlaylists.length,
			updatedPlaylists,
			tracksOrganized,
		},
	});
	if (!reservation.created) {
		return { ok: true, reason: "already_sent" as const };
	}

	const result = await sendOrganizeWeeklyDigestEmail({
		config,
		to: userRow.email,
		idempotencyKey,
		props: {
			dashboardPlaylistsUrl: `${getDashboardUrl()}${DASHBOARD_ROUTES.playlists.path}`,
			recipientName: userRow.name,
			createdCount: createdPlaylists.length,
			updatedCount: updatedPlaylists,
			tracksOrganized,
			newPlaylistNames: createdPlaylists.map((p) => p.name),
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
				runId,
				templateKey: "organize_weekly_digest",
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
			runId,
			templateKey: "organize_weekly_digest",
			providerMessageId: result.emailId,
		},
		"Email delivery sent",
	);

	return { ok: true, reason: "sent" as const };
}

async function getRecentGeneratedPlaylists(userId: string) {
	return db
		.select({
			name: playlist.name,
			trackCount: playlist.trackCount,
		})
		.from(playlist)
		.where(and(eq(playlist.userId, userId), eq(playlist.isGenerated, true)))
		.orderBy(desc(playlist.createdAt))
		.limit(3);
}

export async function sendWelcomeNotification({ userId }: { userId: string }) {
	const config = buildSendConfig();
	if (!config) return { ok: false, reason: "provider_not_configured" as const };

	const userRow = await getUserForEmail(userId);
	if (!userRow?.email) return { ok: false, reason: "missing_email" as const };

	const idempotencyKey = `welcome/${userId}`;
	const policy = await evaluateEmailPolicy({
		userId,
		email: userRow.email,
		templateKey: "welcome",
	});
	if (!policy.allowed) {
		await reserveEmailDelivery({
			userId,
			email: userRow.email,
			templateKey: "welcome",
			idempotencyKey,
			metadata: { policyReason: policy.reason },
		});
		await markEmailDelivery({
			idempotencyKey,
			status: "skipped",
			skipReason: policy.reason,
		});
		logger.info(
			{ userId, templateKey: "welcome", reason: policy.reason },
			"Email delivery skipped",
		);
		return { ok: false, reason: policy.reason };
	}

	const reservation = await reserveEmailDelivery({
		userId,
		email: userRow.email,
		templateKey: "welcome",
		idempotencyKey,
	});
	if (!reservation.created)
		return { ok: true, reason: "already_sent" as const };

	const result = await sendWelcomeEmail({
		config,
		to: userRow.email,
		idempotencyKey,
		props: {
			dashboardUrl: getDashboardUrl(),
			recipientName: userRow.name,
		},
	});

	if (!result.ok) {
		await markEmailDelivery({
			idempotencyKey,
			status: "failed",
			error: result.error,
		});
		logger.warn(
			{ userId, templateKey: "welcome", error: result.error },
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
			templateKey: "welcome",
			providerMessageId: result.emailId,
		},
		"Email delivery sent",
	);
	return { ok: true, reason: "sent" as const };
}

export async function sendFeedback3DayNotification({
	userId,
	campaignKey,
}: {
	userId: string;
	campaignKey: string;
}) {
	const config = buildSendConfig();
	if (!config) return { ok: false, reason: "provider_not_configured" as const };

	const userRow = await getUserForEmail(userId);
	if (!userRow?.email) return { ok: false, reason: "missing_email" as const };

	const idempotencyKey = `feedback-3day/${campaignKey}/${userId}`;
	const policy = await evaluateEmailPolicy({
		userId,
		email: userRow.email,
		templateKey: "feedback_3day",
	});
	if (!policy.allowed) {
		await reserveEmailDelivery({
			userId,
			email: userRow.email,
			templateKey: "feedback_3day",
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
				templateKey: "feedback_3day",
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
		templateKey: "feedback_3day",
		idempotencyKey,
		metadata: { campaignKey },
	});
	if (!reservation.created)
		return { ok: true, reason: "already_sent" as const };

	const result = await sendFeedback3DayEmail({
		config,
		to: userRow.email,
		idempotencyKey,
		props: {
			recipientName: userRow.name,
			feedbackUrl: `${getDashboardUrl()}${DASHBOARD_ROUTES.settings.children.notifications.path}`,
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
			{
				userId,
				templateKey: "feedback_3day",
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
			templateKey: "feedback_3day",
			campaignKey,
			providerMessageId: result.emailId,
		},
		"Email delivery sent",
	);
	return { ok: true, reason: "sent" as const };
}
