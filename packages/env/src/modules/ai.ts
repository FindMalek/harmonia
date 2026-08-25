import { z } from "zod";

// Single source of truth for provider names — @harmonia/ai-provider's
// AIProviderName type is inferred from this schema, not redeclared. No
// runtime env var selects one globally — @harmonia/ai-provider's
// TASK_PROVIDER pins each task to a fixed provider instead (see
// packages/ai-provider/src/models.ts). This schema just names the values
// that map can use.
export const aiProviderSchema = z.enum(["groq", "concentrate", "gemini"]);

export const aiModule = {
	server: {
		HARMONIA_GROQ_API_KEY: z.string().min(1).optional(),
		HARMONIA_CONCENTRATE_API_KEY: z.string().min(1).optional(),
		HARMONIA_GEMINI_API_KEY: z.string().min(1).optional(),
	},
} as const;
