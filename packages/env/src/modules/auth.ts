import { z } from "zod";

/**
 * Auth module - defines authentication and cron configuration
 */
export const authModule = {
	server: {
		HARMONIA_BETTER_AUTH_SECRET: z.string().min(32),
		HARMONIA_SPOTIFY_CLIENT_ID: z.string().min(1),
		HARMONIA_SPOTIFY_CLIENT_SECRET: z.string().min(1).optional(),
		HARMONIA_CRON_SECRET: z.string().min(1).optional(),
		HARMONIA_OPENAI_API_KEY: z.string().min(1).optional(),
		HARMONIA_GROQ_API_KEY: z.string().min(1).optional(),
	},
} as const;
