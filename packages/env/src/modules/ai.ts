import { z } from "zod";

export const aiModule = {
	server: {
		HARMONIA_GROQ_API_KEY: z.string().min(1).optional(),
		HARMONIA_CONCENTRATE_API_KEY: z.string().min(1).optional(),
	},
} as const;
