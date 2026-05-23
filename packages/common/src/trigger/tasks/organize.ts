import { logger } from "@harmonia/logger";
import { task } from "@trigger.dev/sdk/v3";

import { PipelineCancelledError, updateRun } from "../../services/organize";
import { sendOrganizeCompleteEmailTask } from "./emails/send-organize-complete";
import { classifyStageTask } from "./stages/classify";
import { clusterStageTask } from "./stages/cluster";
import { embedStageTask } from "./stages/embed";
import { generateStageTask } from "./stages/generate";
import { lyricsStageTask } from "./stages/lyrics";
import { matchStageTask } from "./stages/match";
import { syncStageTask } from "./stages/sync";

export const organizePipeline = task({
	id: "organize-pipeline",
	retry: { maxAttempts: 1 },
	run: async ({ userId, runId }: { userId: string; runId: number }) => {
		try {
			await updateRun(runId, { status: "running", startedAt: new Date() });

			await syncStageTask.triggerAndWait({ userId, runId });
			await lyricsStageTask.triggerAndWait({ userId, runId });
			await classifyStageTask.triggerAndWait({ userId, runId });
			await embedStageTask.triggerAndWait({ userId, runId });
			await clusterStageTask.triggerAndWait({ userId, runId });
			await generateStageTask.triggerAndWait({ userId, runId });
			await matchStageTask.triggerAndWait({ userId, runId });

			await updateRun(runId, {
				status: "completed",
				currentStage: null,
				completedAt: new Date(),
			});

			try {
				await sendOrganizeCompleteEmailTask.trigger({
					userId,
					runId,
				});
			} catch (emailErr) {
				logger.warn(
					{
						userId,
						runId,
						error:
							emailErr instanceof Error ? emailErr.message : String(emailErr),
					},
					"Failed to queue organize completion email task",
				);
			}

			return { userId, runId, status: "completed" as const };
		} catch (err) {
			if (err instanceof PipelineCancelledError) {
				await updateRun(runId, {
					status: "cancelled",
					completedAt: new Date(),
				});
				return { userId, runId, status: "cancelled" as const };
			}
			const error = err instanceof Error ? err.message : String(err);
			await updateRun(runId, {
				status: "failed",
				error,
				completedAt: new Date(),
			});
			return { userId, runId, status: "failed" as const, error };
		}
	},
});
