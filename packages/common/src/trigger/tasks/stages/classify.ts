import { task } from "@trigger.dev/sdk/v3";

import { classifyTracksBatch } from "../../../services/brain";
import {
	checkCancelled,
	updateRun,
	updateStageProgress,
} from "../../../services/organize";

export const classifyStageTask = task({
	id: "organize-stage-classify",
	retry: { maxAttempts: 2, minTimeoutInMs: 3000, factor: 2 },
	run: async ({ userId, runId }: { userId: string; runId: number }) => {
		await checkCancelled(runId, userId);
		await updateRun(runId, { currentStage: "classify" });
		return await classifyTracksBatch(userId, async (p) => {
			await updateStageProgress(runId, "classify", p);
		});
	},
});
