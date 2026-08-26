import { z } from "zod";

// Provider name values only — @harmonia/ai-provider's TASK_PROVIDER (models.ts) pins each task to one, no env var selects globally.
export const aiProviderSchema = z.enum(["groq", "concentrate", "gemini"]);

export const aiModule = {
	server: {
		HARMONIA_GROQ_API_KEY: z.string().min(1).optional(),
		HARMONIA_CONCENTRATE_API_KEY: z.string().min(1).optional(),
		HARMONIA_GEMINI_API_KEY: z.string().min(1).optional(),
	},
} as const;
