import { z } from "zod";

export const emailsModule = {
	server: {
		SONARAEM_RESEND_API_KEY: z.string().min(1).optional(),
		SONARAEM_EMAIL_FROM: z.string().min(1).optional(),
		SONARAEM_EMAIL_REPLY_TO: z.string().min(1).optional(),
		SONARAEM_RESEND_WEBHOOK_SECRET: z.string().min(1).optional(),
	},
	client: {},
} as const;
