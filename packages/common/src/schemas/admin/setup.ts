import { z } from "zod";

export const adminSetupStatusOutputSchema = z.object({
	needsSetup: z.boolean(),
});
export type AdminSetupStatusOutput = z.infer<
	typeof adminSetupStatusOutputSchema
>;

export const adminSetupCreateInput = z.object({
	name: z.string().trim().min(1, "Name is required").max(100),
	email: z
		.string()
		.trim()
		.pipe(z.email({ error: "Enter a valid email address" })),
	password: z.string().min(8, "Password must be at least 8 characters"),
});
export type AdminSetupCreateInput = z.infer<typeof adminSetupCreateInput>;

export const adminSetupCreateOutputSchema = z.object({
	success: z.boolean(),
});
export type AdminSetupCreateOutput = z.infer<
	typeof adminSetupCreateOutputSchema
>;
