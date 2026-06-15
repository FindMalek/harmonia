import { z } from "zod";

export const billingModule = {
	server: {
		HARMONIA_POLAR_ACCESS_TOKEN: z.string().min(1),
		// Optional: reserved for organization-scoped API calls; not currently consumed
		// by any code path but kept defined so future routes can opt in.
		HARMONIA_POLAR_ORGANIZATION_ID: z.string().min(1).optional(),
		HARMONIA_POLAR_WEBHOOK_SECRET: z.string().min(1),
	},
};
