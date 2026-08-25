import type { aiProviderSchema } from "@harmonia/env";
import type { z } from "zod";

export type AIProviderName = z.infer<typeof aiProviderSchema>;

export type AITask = "classification" | "clusterMetadata" | "playlistNaming";

type ModelsForTask = Partial<Record<AIProviderName, string>>;

// Each task is pinned to a specific provider — not a single global runtime
// switch across all three (that design was replaced before ever shipping;
// a global switch can't express "Groq for these two, Concentrate for that
// one" at the same time). Classification and cluster-metadata stay on
// Groq's hosted gpt-oss models — independently researched and confirmed as
// the best-benchmarked option for both (see #334). Playlist naming runs on
// Claude via Concentrate: gpt-oss-120b has documented real-world
// repetition/looping problems specifically in creative writing, which
// plausibly caused the "everything named Midnight" bug (#112) that the
// temperature-0.8 fix only partially masked rather than fully solved (see
// #334/#335 for the research and decision this came from).
export const TASK_PROVIDER: Record<AITask, AIProviderName> = {
	classification: "groq",
	clusterMetadata: "groq",
	playlistNaming: "concentrate",
};

// getAIModel()/getModelId() throw if a task has no entry for its assigned
// provider (TASK_PROVIDER above), rather than guessing. Concentrate reuses
// Groq's exact models (bare slugs — Concentrate doesn't route gpt-oss under
// an "openai/" prefix) for an apples-to-apples trial; same convention
// applied to Claude's slug below, but it hasn't been confirmed against a
// live Concentrate request yet (needs an API key — verify before relying on
// it in production).
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
		concentrate: "claude-sonnet-5",
		gemini: "gemini-2.5-flash",
	},
} as const;
