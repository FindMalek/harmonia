import { task } from "@trigger.dev/sdk/v3";

import { runClustering } from "../../../services/brain";
import {
	checkCancelled,
	updateRun,
	updateStageProgress,
} from "../../../services/organize";

export const clusterStageTask = task({
	id: "organize-stage-cluster",
	retry: { maxAttempts: 1 },
	run: async ({ userId, runId }: { userId: string; runId: number }) => {
		await checkCancelled(runId, userId);
		await updateRun(runId, { currentStage: "cluster" });
		return await runClustering(userId, async (p) => {
			await updateStageProgress(runId, "cluster", p);
		});
	},
});
