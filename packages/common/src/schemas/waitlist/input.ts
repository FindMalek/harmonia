import { z } from "zod";

export const waitlistSignupInput = z.object({
	email: z.string().email(),
	// Honeypot: real users never fill this in. Bots that auto-fill all fields will.
	website: z.string().optional(),
});
export type WaitlistSignupInput = z.infer<typeof waitlistSignupInput>;
