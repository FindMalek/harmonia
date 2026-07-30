import { z } from "zod";

import { waitlistStatusEnum } from "./enum";

export const waitlistSignupOutputSchema = z.object({
	success: z.boolean(),
});
export type WaitlistSignupOutput = z.infer<typeof waitlistSignupOutputSchema>;

export const waitlistStatusOutputSchema = z.object({
	status: waitlistStatusEnum.nullable(),
	queuePosition: z.number().int().min(1).nullable(),
});
export type WaitlistStatusOutput = z.infer<typeof waitlistStatusOutputSchema>;
