import { z } from "zod";

export const organizeRunOutputSchema = z.object({
	success: z.boolean(),
	userId: z.string(),
	runId: z.number(),
});
export type OrganizeRunOutput = z.infer<typeof organizeRunOutputSchema>;
