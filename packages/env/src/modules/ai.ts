import { z } from "zod";

/**
 * AI module - defines which LLM provider is active and its credentials.
 * HARMONIA_AI_PROVIDER's enum values must stay in sync with AIProviderName
 * in packages/ai-provider/src/models.ts.
 */
export const aiModule = {
	server: {
		HARMONIA_AI_PROVIDER: z
			.enum(["groq", "concentrate", "gemini"])
			.default("groq"),
		HARMONIA_GROQ_API_KEY: z.string().min(1).optional(),
		HARMONIA_CONCENTRATE_API_KEY: z.string().min(1).optional(),
		HARMONIA_GEMINI_API_KEY: z.string().min(1).optional(),
	},
} as const;
