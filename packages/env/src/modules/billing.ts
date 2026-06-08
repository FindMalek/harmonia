import { z } from "zod";

export const billingModule = {
	server: {
		POLAR_ACCESS_TOKEN: z.string().min(1),
		POLAR_ORGANIZATION_ID: z.string().min(1),
		POLAR_WEBHOOK_SECRET: z.string().min(1),
	},
};
