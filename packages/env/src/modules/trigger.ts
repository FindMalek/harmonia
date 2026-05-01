import { z } from "zod";

export const triggerModule = {
	server: {
		TRIGGER_SECRET_KEY: z.string().optional(),
	},
} as const;
