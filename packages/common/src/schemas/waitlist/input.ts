import { z } from "zod";

export const waitlistSignupInput = z.object({
	email: z.string().trim().email(),
	// Honeypot: real users never fill this in. Bots that auto-fill all fields will.
	website: z.string().optional(),
});
export type WaitlistSignupInput = z.infer<typeof waitlistSignupInput>;

export const waitlistStatusInput = z.object({
	email: z.string().trim().email(),
});
export type WaitlistStatusInput = z.infer<typeof waitlistStatusInput>;
