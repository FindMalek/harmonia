import { db } from "@harmonia/db";
import { pipelineRun } from "@harmonia/db/schema/pipeline-run";
import { logger } from "@harmonia/logger";
import { task } from "@trigger.dev/sdk/v3";
import { and, eq } from "drizzle-orm";

import { sendOrganizeCompleteNotification } from "../../../services/email";
import { scheduleFeedback3DayEmailTask } from "./schedule-feedback-3day";

export const sendOrganizeCompleteEmailTask = task({
	id: "email-send-organize-complete",
	retry: { maxAttempts: 2, minTimeoutInMs: 2000, factor: 2 },
	run: async ({ userId, runId }: { userId: string; runId: number }) => {
		const [run] = await db
			.select({ progress: pipelineRun.progress })
			.from(pipelineRun)
			.where(and(eq(pipelineRun.id, runId), eq(pipelineRun.userId, userId)));

		const generate = run?.progress?.generate;
		const playlistsCreated = generate?.playlists ?? 0;
		const tracksOrganized = generate?.tracksOrganized ?? 0;

		const result = await sendOrganizeCompleteNotification({
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
