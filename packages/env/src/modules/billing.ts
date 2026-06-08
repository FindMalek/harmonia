import { z } from "zod";

export const billingModule = {
	server: {
		POLAR_ACCESS_TOKEN: z.string().optional(),
		POLAR_ORGANIZATION_ID: z.string().optional(),
		POLAR_WEBHOOK_SECRET: z.string().optional(),
	},
};
