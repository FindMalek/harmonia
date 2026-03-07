import { z } from "zod";

/**
 * Database module - defines DATABASE_URL schema
 */
export const dbModule = {
	server: {
		DATABASE_URL: z.url(),
	},
} as const;
