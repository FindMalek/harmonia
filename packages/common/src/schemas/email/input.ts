import { z } from "zod";

import { emailTemplateKeyEnum } from "./enum";

export const emailPreferencesUpdateInput = z.object({
	transactionalEnabled: z.boolean().optional(),
	productUpdatesEnabled: z.boolean().optional(),
	marketingEnabled: z.boolean().optional(),
	feedbackEnabled: z.boolean().optional(),
});
export type EmailPreferencesUpdateInput = z.infer<
	typeof emailPreferencesUpdateInput
>;

export const emailSendInput = z.object({
	userId: z.string(),
	templateKey: emailTemplateKeyEnum,
	idempotencyKey: z.string().min(1),
});
export type EmailSendInput = z.infer<typeof emailSendInput>;
