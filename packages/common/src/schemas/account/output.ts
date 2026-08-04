import { z } from "zod";

export const accountDeleteOutputSchema = z.object({
	success: z.boolean(),
});
export type AccountDeleteOutput = z.infer<typeof accountDeleteOutputSchema>;
