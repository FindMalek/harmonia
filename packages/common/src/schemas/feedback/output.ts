import { z } from "zod";

export const submitFeedbackOutputSchema = z.object({
	success: z.literal(true),
	id: z.number(),
});
export type SubmitFeedbackOutput = z.infer<typeof submitFeedbackOutputSchema>;
