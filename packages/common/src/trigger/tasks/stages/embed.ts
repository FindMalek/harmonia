import { task } from "@trigger.dev/sdk/v3";

import { embedTracksBatch } from "../../../services/brain";
import {
	checkCancelled,
	updateRun,
	updateStageProgress,
} from "../../../services/organize";

export const embedStageTask = task({
	id: "organize-stage-embed",
	retry: { maxAttempts: 2, minTimeoutInMs: 2000, factor: 2 },
	run: async ({ userId, runId }: { userId: string; runId: number }) => {
		await checkCancelled(runId, userId);
		await updateRun(runId, { currentStage: "embed" });
		return await embedTracksBatch(userId, async (p) => {
			await updateStageProgress(runId, "embed", p);
		});
	},
});
