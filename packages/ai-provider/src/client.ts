import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import { env } from "@sonaraem/env/server";
import type { LanguageModel } from "ai";

import {
	AI_PROVIDER,
	type AIProviderName,
	type AITask,
	TASK_MODELS,
	TASK_PROVIDER,
} from "./models";

/** The fixed provider assigned to a task — see TASK_PROVIDER in models.ts. */
export function getTaskProvider(task: AITask): AIProviderName {
	return TASK_PROVIDER[task];
}

/** Whether the provider assigned to this task has its required credential set. */
export function isProviderConfigured(task: AITask): boolean {
	switch (getTaskProvider(task)) {
		case AI_PROVIDER.groq:
			return Boolean(env.SONARAEM_GROQ_API_KEY);
		case AI_PROVIDER.concentrate:
			return Boolean(env.SONARAEM_CONCENTRATE_API_KEY);
	}
}

let groqClient: ReturnType<typeof createGroq> | undefined;
let concentrateClient: ReturnType<typeof createOpenAI> | undefined;

function getGroqClient() {
	groqClient ??= createGroq({ apiKey: env.SONARAEM_GROQ_API_KEY });
	return groqClient;
}

function getConcentrateClient() {
	concentrateClient ??= createOpenAI({
		baseURL: "https://api.concentrate.ai/v1",
		apiKey: env.SONARAEM_CONCENTRATE_API_KEY,
		name: "concentrate",
	});
	return concentrateClient;
}

export function getModelId(task: AITask): string {
	return TASK_MODELS[task];
}

export function getAIModel(task: AITask): LanguageModel {
	const modelId = getModelId(task);

	switch (getTaskProvider(task)) {
		case AI_PROVIDER.groq:
			return getGroqClient()(modelId);
		case AI_PROVIDER.concentrate:
			return getConcentrateClient().responses(modelId);
	}
}
