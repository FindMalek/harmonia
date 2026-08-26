export const AI_PROVIDER = {
	groq: "groq",
	concentrate: "concentrate",
} as const;
export type AIProviderName = (typeof AI_PROVIDER)[keyof typeof AI_PROVIDER];

export type AITask = "classification" | "clusterMetadata" | "playlistNaming";

export const TASK_PROVIDER: Record<AITask, AIProviderName> = {
	classification: AI_PROVIDER.groq,
	clusterMetadata: AI_PROVIDER.groq,
	playlistNaming: AI_PROVIDER.concentrate,
};

export const TASK_MODELS: Record<AITask, string> = {
	classification: "openai/gpt-oss-20b",
	clusterMetadata: "openai/gpt-oss-120b",
	playlistNaming: "claude-sonnet-5",
};
