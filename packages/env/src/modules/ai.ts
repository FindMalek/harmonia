import { z } from "zod";

export const aiModule = {
	server: {
		SONARAEM_GROQ_API_KEY: z.string().min(1).optional(),
		SONARAEM_CONCENTRATE_API_KEY: z.string().min(1).optional(),
	},
} as const;
