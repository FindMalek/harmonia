import { z } from "zod";

import { emailSendStatusEnum } from "./enum";

export const emailPreferencesOutputSchema = z.object({
	transactionalEnabled: z.boolean(),
	productUpdatesEnabled: z.boolean(),
	marketingEnabled: z.boolean(),
	feedbackEnabled: z.boolean(),
	unsubscribedAt: z.date().nullable(),
});
export type EmailPreferencesOutput = z.infer<
	typeof emailPreferencesOutputSchema
>;

export const emailSendResultOutputSchema = z.object({
	ok: z.boolean(),
	status: emailSendStatusEnum,
	providerMessageId: z.string().nullable(),
	error: z.string().nullable(),
});
export type EmailSendResultOutput = z.infer<typeof emailSendResultOutputSchema>;
