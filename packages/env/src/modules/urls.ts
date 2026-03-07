import { z } from "zod";

/**
 * URLs module - defines application URL configuration
 */
export const urlsModule = {
	client: {
		NEXT_PUBLIC_WEB_URL: z.url().optional(),
		NEXT_PUBLIC_DASHBOARD_URL: z.url().optional(),
	},
} as const;
