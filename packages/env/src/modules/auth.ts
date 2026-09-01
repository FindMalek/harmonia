import { z } from "zod";

/**
 * Auth module - defines authentication and cron configuration
 */
export const authModule = {
	server: {
		SONARAEM_BETTER_AUTH_SECRET: z.string().min(32),
		SONARAEM_SPOTIFY_CLIENT_ID: z.string().min(1),
		SONARAEM_SPOTIFY_CLIENT_SECRET: z.string().min(1).optional(),
		SONARAEM_CRON_SECRET: z.string().min(1).optional(),
		SONARAEM_OPENAI_API_KEY: z.string().min(1).optional(),
	},
} as const;
