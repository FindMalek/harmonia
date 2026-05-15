import { task } from "@trigger.dev/sdk/v3";

import { PipelineCancelledError, updateRun } from "../../services/organize";
import { classifyStageTask } from "./stages/classify";
import { clusterStageTask } from "./stages/cluster";
import { embedStageTask } from "./stages/embed";
import { generateStageTask } from "./stages/generate";
import { lyricsStageTask } from "./stages/lyrics";
import { matchStageTask } from "./stages/match";
import { syncStageTask } from "./stages/sync";

/** Minimum fraction of tracks that must be classified for the pipeline to be considered healthy. */
const MIN_CLASSIFY_RATIO = 0.1;

export const organizePipeline = task({
	id: "organize-pipeline",
	retry: { maxAttempts: 1 },
	run: async ({ userId, runId }: { userId: string; runId: number }) => {
		try {
			await updateRun(runId, { status: "running", startedAt: new Date() });

			await syncStageTask.triggerAndWait({ userId, runId });
			await lyricsStageTask.triggerAndWait({ userId, runId });
			const classifyResult = await classifyStageTask.triggerAndWait({ userId, runId });

			// Gate: if classification coverage is critically low, mark as degraded
			if (
				classifyResult &&
				typeof classifyResult.total === "number" &&
				typeof classifyResult.classified === "number" &&
				classifyResult.total > 0 &&
				classifyResult.classified / classifyResult.total < MIN_CLASSIFY_RATIO
			) {
				const coverage = ((classifyResult.classified / classifyResult.total) * 100).toFixed(1);
				const warning = `Classify stage coverage critically low: ${classifyResult.classified}/${classifyResult.total} tracks (${coverage}%). Pipeline result is degraded — re-run recommended.`;

				await updateRun(runId, {
					status: "partial",
					currentStage: null,
					error: warning,
					completedAt: new Date(),
				});

				return { userId, runId, status: "partial" as const, warning };
			}

			await embedStageTask.triggerAndWait({ userId, runId });
			await clusterStageTask.triggerAndWait({ userId, runId });
			await generateStageTask.triggerAndWait({ userId, runId });
			await matchStageTask.triggerAndWait({ userId, runId });

			await updateRun(runId, {
				status: "completed",
				currentStage: null,
				completedAt: new Date(),
			});

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