import { z } from "zod";

/**
 * Auth module - defines authentication and cron configuration
 */
export const authModule = {
	server: {
		BETTER_AUTH_SECRET: z.string().min(32),
		SPOTIFY_CLIENT_ID: z.string().min(1),
		SPOTIFY_CLIENT_SECRET: z.string().min(1).optional(),
		CRON_SECRET: z.string().min(1).optional(),
		OPENAI_API_KEY: z.string().min(1).optional(),
		GROQ_API_KEY: z.string().min(1).optional(),
	},
} as const;
