// Must stay in sync with HARMONIA_AI_PROVIDER's enum in packages/env/src/modules/ai.ts.
export type AIProviderName = "groq" | "concentrate" | "gemini";

export type AITask = "classification" | "clusterMetadata" | "playlistNaming";

type ModelsForTask = Partial<Record<AIProviderName, string>>;

// getAIModel()/getModelId() throw if a task has no entry for the active
// provider, rather than guessing. Concentrate reuses Groq's exact models
// (available on Concentrate's own catalog) for an apples-to-apples trial.
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
