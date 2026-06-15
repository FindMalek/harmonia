import { z } from "zod";

export const billingModule = {
	server: {
		POLAR_ACCESS_TOKEN: z.string().min(1),
		// Optional: reserved for organization-scoped API calls; not currently consumed
		// by any code path but kept defined so future routes can opt in.
		POLAR_ORGANIZATION_ID: z.string().min(1).optional(),
		POLAR_WEBHOOK_SECRET: z.string().min(1),
	},
};
