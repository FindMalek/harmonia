import { z } from "zod";

/**
 * Inngest module - defines background job configuration
 *
 * For local development: leave these empty to use the Inngest Dev Server
 * For production: set these to your Inngest cloud keys from https://app.inngest.com
 */
export const inngestModule = {
	server: {
		INNGEST_EVENT_KEY: z.string().optional(),
		INNGEST_SIGNING_KEY: z.string().optional(),
	},
} as const;
