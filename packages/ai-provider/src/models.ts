import type { aiProviderSchema } from "@harmonia/env";
import type { z } from "zod";

export type AIProviderName = z.infer<typeof aiProviderSchema>;

export type AITask = "classification" | "clusterMetadata" | "playlistNaming";

// Per-task fixed assignment, not a global switch — one var can't express Groq for two tasks + Concentrate for the third (#334/#335).
export const TASK_PROVIDER: Record<AITask, AIProviderName> = {
	classification: "groq",
	clusterMetadata: "groq",
	playlistNaming: "concentrate",
};

// One model ID per task, matching TASK_PROVIDER 1:1. claude-sonnet-5 not yet verified against a live Concentrate request.
export const TASK_MODELS: Record<AITask, string> = {
	classification: "openai/gpt-oss-20b",
	clusterMetadata: "openai/gpt-oss-120b",
	playlistNaming: "claude-sonnet-5",
};
