import { env } from "@harmonia/env/server";
import { logger } from "@harmonia/logger";
import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

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

	const { object } = await generateObject({
		model: groq("gpt-oss-120b"),
		schema: classificationResultListSchema,
		prompt: [
			"You are an expert music analyst. You receive a list of tracks with metadata, audio features, and (optionally) lyrics.",
			"For EACH track, you must return:",
			"- trackId (exactly as provided)",
			"- mood: the primary mood (short phrase)",
			"- secondaryMoods: a few related moods (0-3 items)",
			"- themes: textual themes or topics (0-5 items)",
			"- vocalType: e.g. 'instrumental', 'female vocal', 'male vocal', 'mixed', or 'unknown'",
			"- energyLevel: e.g. 'low', 'medium', 'high'",
			"- domainName: the best matching genre domain name (from our taxonomy) if you can infer one, otherwise null.",
			"",
			"Return an array with one object per input track, in the SAME ORDER as the input.",
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
}
