import { z } from "zod";

// Single source of truth for provider names — @harmonia/ai-provider's
// AIProviderName type is inferred from this schema, not redeclared.
export const aiProviderSchema = z.enum(["groq", "concentrate", "gemini"]);

export const aiModule = {
	server: {
		HARMONIA_AI_PROVIDER: aiProviderSchema.default("groq"),
		HARMONIA_GROQ_API_KEY: z.string().min(1).optional(),
		HARMONIA_CONCENTRATE_API_KEY: z.string().min(1).optional(),
		HARMONIA_GEMINI_API_KEY: z.string().min(1).optional(),
	},
} as const;
