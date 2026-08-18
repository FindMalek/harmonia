import type { aiProviderSchema } from "@harmonia/env";
import type { z } from "zod";

export type AIProviderName = z.infer<typeof aiProviderSchema>;

export type AITask = "classification" | "clusterMetadata" | "playlistNaming";

type ModelsForTask = Partial<Record<AIProviderName, string>>;

// getAIModel()/getModelId() throw if a task has no entry for the active
// provider, rather than guessing. Concentrate reuses Groq's exact models
// (bare slugs — Concentrate doesn't route gpt-oss under an "openai/" prefix)
// for an apples-to-apples trial.
export const TASK_MODELS: Record<AITask, ModelsForTask> = {
	classification: {
		groq: "openai/gpt-oss-20b",
		concentrate: "gpt-oss-20b",
		gemini: "gemini-2.5-flash-lite",
	},
	clusterMetadata: {
		groq: "openai/gpt-oss-120b",
		concentrate: "gpt-oss-120b",
		gemini: "gemini-2.5-flash",
	},
	playlistNaming: {
		groq: "openai/gpt-oss-120b",
		concentrate: "gpt-oss-120b",
		gemini: "gemini-2.5-flash",
	},
} as const;
