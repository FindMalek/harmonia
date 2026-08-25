import type { aiProviderSchema } from "@harmonia/env";
import type { z } from "zod";

export type AIProviderName = z.infer<typeof aiProviderSchema>;

export type AITask = "classification" | "clusterMetadata" | "playlistNaming";

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

// One model ID per task, matching that task's TASK_PROVIDER entry above —
// not a full task×provider matrix. There's exactly one live pairing per
// task; a matrix of untested "what if this task used a different provider"
// entries would be unverified config nobody reads. Reassigning a task to a
// different provider means changing both maps together, which is the point:
// they're meant to move as a pair, not independently.
// claude-sonnet-5 hasn't been confirmed against a live Concentrate request
// yet (needs an API key) — verify before relying on it in production.
export const TASK_MODELS: Record<AITask, string> = {
	classification: "openai/gpt-oss-20b",
	clusterMetadata: "openai/gpt-oss-120b",
	playlistNaming: "claude-sonnet-5",
};
