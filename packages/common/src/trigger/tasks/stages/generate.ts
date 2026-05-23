import { task } from "@trigger.dev/sdk/v3";

import {
	generateClusterMetadata,
	generatePlaylists,
} from "../../../services/brain";
import {
	checkCancelled,
	updateRun,
	updateStageProgress,
} from "../../../services/organize";

export const generateStageTask = task({
	id: "organize-stage-generate",
	retry: { maxAttempts: 1 },
	run: async ({ userId, runId }: { userId: string; runId: number }) => {
		await checkCancelled(runId, userId);
		await updateRun(runId, { currentStage: "generate" });
		await generateClusterMetadata(userId);
		const result = await generatePlaylists(userId, async (p) => {
			await updateStageProgress(runId, "generate", p);
		});
		await updateStageProgress(runId, "generate", result);
		return result;
	},
});
