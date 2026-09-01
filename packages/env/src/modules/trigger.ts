import { z } from "zod";

export const triggerModule = {
	server: {
		SONARAEM_TRIGGER_SECRET_KEY: z.string().optional(),
		SONARAEM_TRIGGER_PROJECT_REF: z.string().optional(),
	},
} as const;
