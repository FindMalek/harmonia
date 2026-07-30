import { task } from "@trigger.dev/sdk";

import { autoExportUpdatedPlaylists } from "../../../services/music";
import { checkCancelled } from "../../../services/organize";

export const exportStageTask = task({
	id: "organize-stage-export",
	retry: { maxAttempts: 2 },
	run: async ({
		userId,
		runId,
		playlistIds,
	}: {
		userId: string;
		runId: number;
		playlistIds: number[];
	}) => {
		await checkCancelled(runId, userId);
		return await autoExportUpdatedPlaylists(userId, playlistIds);
	},
});
