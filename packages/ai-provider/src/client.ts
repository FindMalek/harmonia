import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import { env } from "@harmonia/env/server";
import type { LanguageModel } from "ai";

import { type AITask, TASK_MODELS } from "./models";

export const activeProvider = env.HARMONIA_AI_PROVIDER;

/** Whether the active provider has its required credential set. */
export function isProviderConfigured(): boolean {
	switch (activeProvider) {
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

// Throws rather than guessing when the active provider has no entry — see TASK_MODELS.
export function getModelId(task: AITask): string {
	const modelId = TASK_MODELS[task][activeProvider];

	if (!modelId) {
		throw new Error(
			`No model configured for task "${task}" on provider "${activeProvider}" — add an entry to TASK_MODELS in packages/ai-provider/src/models.ts`,
		);
	}

	return modelId;
}

export function getAIModel(task: AITask): LanguageModel {
	const modelId = getModelId(task);

	switch (activeProvider) {
		case "groq":
			return getGroqClient()(modelId);
		case "concentrate":
			return getConcentrateClient().responses(modelId);
		case "gemini":
			return getGeminiClient()(modelId);
	}
}
