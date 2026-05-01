import { task } from "@trigger.dev/sdk/v3";

import { matchNewTracksToPlaylists } from "../../../services/brain";
import { checkCancelled } from "../../../services/organize";

export const matchStageTask = task({
	id: "organize-stage-match",
	retry: { maxAttempts: 2 },
	run: async ({ userId, runId }: { userId: string; runId: number }) => {
		await checkCancelled(runId, userId);
		return await matchNewTracksToPlaylists(userId);
	},
});
