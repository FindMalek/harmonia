import { db } from "@sonaraem/db";
import { pipelineRun } from "@sonaraem/db/schema/pipeline-run";
import { logger } from "@sonaraem/logger";
import { task } from "@trigger.dev/sdk";
import { and, eq } from "drizzle-orm";

import {
	sendOrganizeCompleteNotification,
	sendOrganizeWeeklyDigestNotification,
	wasStillWatching,
} from "../../../services/email";
import { scheduleFeedback3DayEmailTask } from "./schedule-feedback-3day";

// A client still watching the run sends a heartbeat every 20s (see
// usePipelineProgressDrive) — treat anything within 2 missed beats + slack
// as "still here", no need to email them their own live progress.
const MANUAL_EMAIL_AWAY_THRESHOLD_MS = 45_000;

export const sendOrganizeCompleteEmailTask = task({
	id: "email-send-organize-complete",
	retry: { maxAttempts: 2, minTimeoutInMs: 2000, factor: 2 },
	run: async ({ userId, runId }: { userId: string; runId: number }) => {
		const [run] = await db
			.select({
				progress: pipelineRun.progress,
				triggeredBy: pipelineRun.triggeredBy,
				completedAt: pipelineRun.completedAt,
				lastClientSeenAt: pipelineRun.lastClientSeenAt,
			})
			.from(pipelineRun)
			.where(and(eq(pipelineRun.id, runId), eq(pipelineRun.userId, userId)));

		if (!run) {
			throw new Error(
				`Pipeline run not found for userId=${userId}, runId=${runId}`,
			);
		}

		const generate = run.progress?.generate;
		const playlistsCreated = generate?.playlists ?? 0;
		const tracksOrganized = generate?.tracksOrganized ?? 0;
		const isCron = run.triggeredBy === "cron";

		const stillWatching = wasStillWatching({
			triggeredBy: run.triggeredBy,
			completedAt: run.completedAt,
			lastClientSeenAt: run.lastClientSeenAt,
			awayThresholdMs: MANUAL_EMAIL_AWAY_THRESHOLD_MS,
		});

		if (stillWatching) {
			logger.info(
				{ userId, runId },
				"Skipping organize completion email — user was still watching when the run finished",
			);
			// Still an ok:true outcome (matches the already_sent path below) — the
			// 3-day feedback follow-up should fire regardless of whether the
			// completion email itself was needed.
			await scheduleFeedback3DayEmailTask.trigger({
				userId,
				campaignKey: `organize-run-${runId}`,
			});
			return { ok: true, reason: "user_still_watching" as const };
		}

		// Manual runs keep the plain completion email; only the scheduled weekly cron run gets the digest (#168, #169).
		const result = isCron
			? await sendOrganizeWeeklyDigestNotification({
					userId,
					runId,
					createdPlaylists: generate?.createdPlaylists ?? [],
					updatedPlaylists: generate?.updatedPlaylistIds?.length ?? 0,
					tracksOrganized,
				})
			: await sendOrganizeCompleteNotification({
					userId,
					runId,
					playlistsCreated,
					tracksOrganized,
				});

		if (!result.ok) {
			logger.warn(
				{
					userId,
					runId,
					reason: result.reason,
					error: "error" in result ? result.error : undefined,
				},
				"Organize completion email not sent",
			);
		}

		if (result.ok) {
			await scheduleFeedback3DayEmailTask.trigger({
				userId,
				campaignKey: `organize-run-${runId}`,
			});
		}

		return result;
	},
});
