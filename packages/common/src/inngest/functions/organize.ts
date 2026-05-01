import { runOrganizeForUser } from "../../services/organize";
import { inngest } from "../client";

export const organizePipeline = inngest.createFunction(
	{ id: "organize-pipeline" },
	{ event: "organize/requested" },
	async ({ event, step }) => {
		const { userId, runId } = event.data;

		// The heavy lifting logic is still handled by `runOrganizeForUser`,
		// but eventually you would break down `runOrganizeForUser` into smaller
		// step.run calls right here if we want absolute maximum fault tolerance.
		// For now, wrapping it in a simple step ensures it executes in the background
		// away from Vercel's API limits.
		const result = await step.run("run-organize-pipeline", async () => {
			return await runOrganizeForUser({ userId, runId });
		});

		return result;
	},
);
