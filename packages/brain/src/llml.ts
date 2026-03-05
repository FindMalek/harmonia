import { env } from "@harmonia/env/server";
import { logger } from "@harmonia/logger";
import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import pRetry from "p-retry";

import {
	classificationResultListSchema,
	type ClassificationResult,
	type TrackForClassification,
} from "./schemas";

const groq = createOpenAI({
	apiKey: env.GROQ_API_KEY,
	baseURL: "https://api.groq.com/openai/v1",
});

export async function classifyTracksWithLLM(
	tracks: TrackForClassification[],
): Promise<ClassificationResult[]> {
	if (!env.GROQ_API_KEY) {
		logger.warn(
			{},
			"No GROQ_API_KEY configured; skipping LLM classification and returning empty results",
		);
		return [];
	}

	return pRetry(
		async () => {
			const { object } = await generateObject({
				model: groq("openai/gpt-oss-120b"),
				schema: classificationResultListSchema,
				prompt: [
					"You are an expert music analyst and curator. You receive a batch of tracks with metadata and (optionally) lyrics.",
					"",
					"For EACH track, analyze and return:",
					"- trackId: exactly as provided",
					"- mood: primary mood as a short phrase (e.g. 'melancholic', 'euphoric', 'aggressive', 'dreamy')",
					"- secondaryMoods: 0-3 related moods",
					"- themes: 0-5 textual themes/topics found in the lyrics or inferred from metadata (e.g. 'love', 'loss', 'rebellion', 'self-discovery')",
					"- topics: 0-5 specific subject matters (e.g. 'relationships', 'nightlife', 'mental health', 'politics')",
					"- vibe: 0-5 situational/atmospheric descriptors (e.g. 'night drive', 'rainy day', 'workout', 'late night study', 'summer road trip')",
					"- vocalType: 'instrumental', 'female vocal', 'male vocal', 'mixed', or 'unknown'",
					"- energyLevel: 'very low', 'low', 'medium', 'high', 'very high'",
					"- language: primary language of lyrics (e.g. 'english', 'spanish', 'korean', 'instrumental')",
					"- era: musical era (e.g. '2020s', '2010s', '2000s', '90s', 'classic')",
					"- domainName: best matching genre domain if inferable, otherwise null",
					"",
					"Guidelines:",
					"- If lyrics are provided, use them as the primary signal for mood, themes, topics, and vibe.",
					"- If lyrics are null, infer from artist name, track name, album name, and genre.",
					"- Be specific with vibes - think about when/where someone would listen to this song.",
					"- Return an array with one object per input track, in the SAME ORDER as the input.",
					"",
					"Tracks JSON:",
					JSON.stringify(tracks),
				].join("\n"),
			});

			for (const item of object) {
				if (!item.trackId) {
					logger.warn(
						{ item },
						"LLM classification result missing trackId; this item will be ignored",
					);
				}
			}

			return object;
		},
		{
			retries: 3,
			minTimeout: 2000,
			onFailedAttempt: (error) => {
				logger.warn(
					{
						attempt: error.attemptNumber,
						retriesLeft: error.retriesLeft,
						error: String(error),
					},
					"LLM classification failed, retrying",
				);
			},
		},
	);
}
