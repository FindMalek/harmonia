import { task } from "@trigger.dev/sdk";

import { fetchAndCacheArtistImages } from "../../../services/music";
import { checkCancelled } from "../../../services/organize";

export const artistsStageTask = task({
	id: "organize-stage-artists",
	retry: { maxAttempts: 2, minTimeoutInMs: 2000, factor: 2 },
	run: async ({ userId, runId }: { userId: string; runId: number }) => {
		await checkCancelled(runId, userId);
		return await fetchAndCacheArtistImages(userId, runId);
	},
});
