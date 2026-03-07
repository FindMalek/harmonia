import { z } from "zod";

export const organizeRunResultSchema = z.object({
	userId: z.string(),
	runId: z.number(),
	status: z.enum(["completed", "failed"]),
	error: z.string().optional(),
});
export type OrganizeRunResult = z.infer<typeof organizeRunResultSchema>;

export const organizeRunOutputSchema = z.object({
	success: z.boolean(),
	results: z.array(organizeRunResultSchema),
});
export type OrganizeRunOutput = z.infer<typeof organizeRunOutputSchema>;
