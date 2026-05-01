import { task } from "@trigger.dev/sdk/v3";

import { runOrganizeForUser } from "../../services/organize";

export const organizePipeline = task({
	id: "organize-pipeline",
	retry: { maxAttempts: 1 },
	run: async (payload: { userId: string; runId: number }) => {
		return await runOrganizeForUser(payload);
	},
});
