import { z } from "zod";

export const waitlistSignupOutputSchema = z.object({
	success: z.boolean(),
});
export type WaitlistSignupOutput = z.infer<typeof waitlistSignupOutputSchema>;
