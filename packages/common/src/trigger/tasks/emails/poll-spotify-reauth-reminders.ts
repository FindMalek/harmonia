import { db } from "@harmonia/db";
import { account } from "@harmonia/db/schema/auth";
import { userSpotifyLibraryStats } from "@harmonia/db/schema/spotify";
import { logger } from "@harmonia/logger";
import { schedules } from "@trigger.dev/sdk";
import { and, eq, isNotNull, isNull, lte, ne, or } from "drizzle-orm";

import {
	determineReauthReminderStage,
	REMINDER_14D_WINDOW_MS,
} from "../../../services/music/spotify/reauth-reminder";
import { sendSpotifyReauthEmailTask } from "./send-spotify-reauth";

// Two-stage warning before Spotify's 6-month refresh token expiry (#289):
// 14 days out, then 3 days out if still not reconnected. Daily cadence is
// plenty against a 6-month window — no need for anything tighter.
export const pollSpotifyReauthRemindersTask = schedules.task({
	id: "email-poll-spotify-reauth-reminders",
	cron: "0 8 * * *",
	run: async () => {
		const now = new Date();
		const in14Days = new Date(now.getTime() + REMINDER_14D_WINDOW_MS);

		// Already-dead connections are handled by the reactive path in client.ts,
		// not this proactive reminder — sending "expires soon" to an already-dead
		// connection would be confusing, not helpful.
		const candidates = await db
			.select({
				userId: account.userId,
				refreshTokenExpiresAt: account.refreshTokenExpiresAt,
				reauthReminderStage: userSpotifyLibraryStats.reauthReminderStage,
			})
			.from(account)
			.leftJoin(
				userSpotifyLibraryStats,
				eq(userSpotifyLibraryStats.userId, account.userId),
			)
			.where(
				and(
					eq(account.providerId, "spotify"),
					isNotNull(account.refreshTokenExpiresAt),
					lte(account.refreshTokenExpiresAt, in14Days),
					or(
						isNull(userSpotifyLibraryStats.needsReauth),
						eq(userSpotifyLibraryStats.needsReauth, false),
					),
					// reauthReminderStage = '3d' means both stages already sent for this cycle.
					or(
						isNull(userSpotifyLibraryStats.reauthReminderStage),
						ne(userSpotifyLibraryStats.reauthReminderStage, "3d"),
					),
				),
			);

		if (candidates.length === 0) return { sent14d: 0, sent3d: 0 };

		let sent14d = 0;
		let sent3d = 0;

		for (const candidate of candidates) {
			if (!candidate.refreshTokenExpiresAt) continue;

			const stage = determineReauthReminderStage(
				candidate.refreshTokenExpiresAt,
				candidate.reauthReminderStage,
				now,
			);
			if (stage === null) continue;

			try {
				// Waits for actual delivery so the stage is only recorded as sent
				// once it really was — a fire-and-forget .trigger() would let the
				// stage get marked even if the send itself later fails.
				const result = await sendSpotifyReauthEmailTask.triggerAndWait({
					userId: candidate.userId,
					stage,
				});
				if (!result.ok) {
					logger.warn(
						{ userId: candidate.userId, stage, error: result.error },
						"Spotify reauth reminder email task failed",
					);
					continue;
				}
				await db
					.insert(userSpotifyLibraryStats)
					.values({ userId: candidate.userId, reauthReminderStage: stage })
					.onConflictDoUpdate({
						target: userSpotifyLibraryStats.userId,
						set: { reauthReminderStage: stage },
					});
				if (stage === "14d") sent14d++;
				else sent3d++;
			} catch (err) {
				logger.warn(
					{
						userId: candidate.userId,
						stage,
						error: err instanceof Error ? err.message : String(err),
					},
					"Failed to trigger Spotify reauth reminder email",
				);
			}
		}

		logger.info(
			{ candidates: candidates.length, sent14d, sent3d },
			"Completed Spotify reauth reminder poll",
		);

		return { sent14d, sent3d };
	},
});
