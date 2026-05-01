import { task } from "@trigger.dev/sdk/v3";

import { fetchLyricsForPendingTracks } from "../../../services/music";
import {
	checkCancelled,
	updateRun,
	updateStageProgress,
} from "../../../services/organize";

export const lyricsStageTask = task({
	id: "organize-stage-lyrics",
	retry: { maxAttempts: 2, minTimeoutInMs: 2000, factor: 2 },
	run: async ({ userId, runId }: { userId: string; runId: number }) => {
		await checkCancelled(runId, userId);
		await updateRun(runId, { currentStage: "lyrics" });
		return await fetchLyricsForPendingTracks(userId, async (p) => {
			await updateStageProgress(runId, "lyrics", p);
		});
	},
});
