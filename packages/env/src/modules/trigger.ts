import { z } from "zod";

export const triggerModule = {
	server: {
		HARMONIA_TRIGGER_SECRET_KEY: z.string().optional(),
		HARMONIA_TRIGGER_PROJECT_REF: z.string().optional(),
	},
} as const;
