import { z } from "zod";

/**
 * URLs module - defines application URL configuration
 */
export const urlsModule = {
	client: {
		NEXT_PUBLIC_HARMONIA_WEB_URL: z.url().optional(),
		NEXT_PUBLIC_HARMONIA_DASHBOARD_URL: z.url().optional(),
		NEXT_PUBLIC_POLAR_CHECKOUT_URL: z.string().url().optional(),
	},
} as const;
