/**
 * HARMONIA_AI_PROVIDER's zod enum (packages/env/src/modules/ai.ts) must stay
 * in sync with this union.
 */
export type AIProviderName = "groq" | "concentrate" | "gemini";

export type AITask = "classification" | "clusterMetadata" | "playlistNaming";

type ModelsForTask = Partial<Record<AIProviderName, string>>;

/**
 * Per-task, per-provider model IDs. Not every provider has an entry for
 * every task — getAIModel()/getModelId() throw a clear error rather than
 * silently guessing when one is missing.
 *
 * - groq: today's live values (unchanged by this migration).
 * - concentrate: same underlying open-weight models Concentrate's own
 *   catalog lists at $0.00/M, so this is an apples-to-apples comparison
 *   against Groq rather than a different model — not yet verified against
 *   a live request (issue #311's open spike).
 * - gemini: current stable (non-preview) API model IDs, picked for cost
 *   tier appropriate to call volume — open to revision.
 */
export const TASK_MODELS: Record<AITask, ModelsForTask> = {
	classification: {
		groq: "openai/gpt-oss-20b",
		concentrate: "openai/gpt-oss-20b",
		gemini: "gemini-2.5-flash-lite",
	},
	clusterMetadata: {
		groq: "openai/gpt-oss-120b",
		concentrate: "openai/gpt-oss-120b",
		gemini: "gemini-2.5-flash",
	},
	playlistNaming: {
		groq: "openai/gpt-oss-120b",
		concentrate: "openai/gpt-oss-120b",
		gemini: "gemini-2.5-flash",
	},
} as const;
