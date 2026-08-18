import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import { env } from "@harmonia/env/server";
import type { LanguageModel } from "ai";

import { type AITask, TASK_MODELS } from "./models";

/** The currently configured provider — defaults to "groq". */
export function getActiveProvider() {
	return env.HARMONIA_AI_PROVIDER;
}

/** Whether the active provider has its required credential set. */
export function isProviderConfigured(): boolean {
	switch (getActiveProvider()) {
		case "groq":
			return Boolean(env.HARMONIA_GROQ_API_KEY);
		case "concentrate":
			return Boolean(env.HARMONIA_CONCENTRATE_API_KEY);
		case "gemini":
			return Boolean(env.HARMONIA_GEMINI_API_KEY);
	}
}

let groqClient: ReturnType<typeof createGroq> | undefined;
let concentrateClient: ReturnType<typeof createOpenAI> | undefined;
let geminiClient: ReturnType<typeof createGoogleGenerativeAI> | undefined;

function getGroqClient() {
	groqClient ??= createGroq({ apiKey: env.HARMONIA_GROQ_API_KEY });
	return groqClient;
}

function getConcentrateClient() {
	concentrateClient ??= createOpenAI({
		baseURL: "https://api.concentrate.ai/v1",
		apiKey: env.HARMONIA_CONCENTRATE_API_KEY,
		name: "concentrate",
	});
	return concentrateClient;
}

function getGeminiClient() {
	geminiClient ??= createGoogleGenerativeAI({
		apiKey: env.HARMONIA_GEMINI_API_KEY,
	});
	return geminiClient;
}

/**
 * Resolves the model ID configured for a task on the active provider.
 * Throws rather than falling back to a guess when nothing is configured —
 * see TASK_MODELS in ./models.
 */
export function getModelId(task: AITask): string {
	const provider = getActiveProvider();
	const modelId = TASK_MODELS[task][provider];

	if (!modelId) {
		throw new Error(
			`No model configured for task "${task}" on provider "${provider}" — add an entry to TASK_MODELS in packages/ai-provider/src/models.ts`,
		);
	}

	return modelId;
}

/**
 * Resolves the AI SDK model to use for a given task, based on the active
 * HARMONIA_AI_PROVIDER. This is the single place that constructs a
 * provider client — call sites should never import createGroq/createOpenAI/
 * createGoogleGenerativeAI directly.
 */
export function getAIModel(task: AITask): LanguageModel {
	const provider = getActiveProvider();
	const modelId = getModelId(task);

	switch (provider) {
		case "groq":
			return getGroqClient()(modelId);
		case "concentrate":
			return getConcentrateClient().responses(modelId);
		case "gemini":
			return getGeminiClient()(modelId);
	}
}
