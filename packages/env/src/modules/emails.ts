import { z } from "zod";

export const emailsModule = {
	server: {
		HARMONIA_RESEND_API_KEY: z.string().min(1).optional(),
		HARMONIA_EMAIL_FROM: z.string().min(1).optional(),
		HARMONIA_EMAIL_REPLY_TO: z.string().min(1).optional(),
		HARMONIA_RESEND_WEBHOOK_SECRET: z.string().min(1).optional(),
	},
	client: {
		NEXT_PUBLIC_HARMONIA_EMAIL_PREFERENCES_URL: z.url().optional(),
	},
} as const;
