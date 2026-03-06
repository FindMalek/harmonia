import { createOpenAI } from "@ai-sdk/openai";
import { env } from "@harmonia/env/server";
import { logger } from "@harmonia/logger";
import { generateText, Output, NoObjectGeneratedError } from "ai";
import pRetry from "p-retry";

import {
	type ClassificationResult,
	type TrackForClassification,
	classificationResultListSchema,
} from "./schemas";

const groq = createOpenAI({
	apiKey: env.GROQ_API_KEY,
	baseURL: "https://api.groq.com/openai/v1",
});

function buildClassificationPrompt(tracks: TrackForClassification[]): string {
	return `# Role

You are an expert music analyst and curator with deep knowledge of genres, lyrical themes, production styles, and listener psychology. Your job is to analyze tracks and produce consistent, richly descriptive classifications that will power music discovery and playlist generation.

# Task

Analyze each track in the input batch and return one classification object per track. Preserve the exact input order—output array index N must correspond to input track index N. Copy each track's \`id\` as \`trackId\` exactly.

# Output Fields

## mood (required, string or null)
The primary emotional quality of the track. Choose ONE word or short phrase. Prefer from this vocabulary when applicable, but you may use synonyms:
- Emotional: melancholic, euphoric, nostalgic, bittersweet, somber, triumphant, brooding, wistful, hopeful, cynical, anxious, serene, cathartic, vulnerable, defiant, empowered, resigned, yearning, joyful, wistful
- Energy: aggressive, intense, chaotic, meditative, laid-back, mellow, energetic, subdued, explosive, hypnotic, frenetic, calm, restless
- Tone: dreamy, dark, playful, romantic, sensual, haunting, uplifting, gritty, ethereal, earthy, cosmic, raw

Use null only if the track is purely instrumental with no inferable mood from production or metadata.

## secondaryMoods (array of strings, 0–3 items)
Complementary moods that apply. Pick from the same vocabulary above. Avoid duplicating the primary mood. Can be empty for very singular tracks.

## themes (array of strings, 0–5 items)
Broad lyrical or conceptual themes. Examples:
- Emotions: love, loss, heartbreak, hope, despair, nostalgia, freedom, struggle, longing
- Life: self-discovery, identity, coming of age, growth, disillusionment, rebellion, escapism
- Social: relationships, friendship, family, community, isolation, belonging, protest, politics
- Existential: spirituality, mortality, purpose, fate, transcendence, solitude
- Place: urban life, nature, travel, home, the road, night, the city

## topics (array of strings, 0–5 items)
More concrete subject matter. Examples:
- Life: relationships, breakups, romance, nightlife, partying, mental health, addiction, healing
- Society: politics, social commentary, inequality, activism, culture, fame
- Experience: work, ambition, success, failure, money, lifestyle, sports, cars
- Inner: introspection, depression, anxiety, empowerment, vulnerability, confidence
- Setting: summer, winter, rain, ocean, city, countryside, road trip, club, bedroom

## vibe (array of strings, 0–5 items)
When and where someone would typically listen. Be specific and situational. Examples:
- Activities: night drive, rainy day, workout, gym, running, late night study, cooking, cleaning, morning coffee
- Settings: beach day, pool party, backyard BBQ, rooftop sunset, cabin in the woods
- States: crying in bed, dancing alone, pre-game, post-breakup, date night
- Scenes: summer road trip, winter cozy, city commute, forest walk, beach bonfire
- Occasions: party, chill hangout, focus work, meditation, getting ready, winding down

## vocalType (required, string or null)
Exactly one of: "instrumental" | "female vocal" | "male vocal" | "mixed" | "unknown"
Use "instrumental" only when there are no sung or spoken vocals. Use "mixed" for male + female or featured artists. Use "unknown" only when truly ambiguous.

## energyLevel (required, string or null)
Exactly one of: "very low" | "low" | "medium" | "high" | "very high"
Align with the track's intensity and pace. Use valence/energy/danceability from metadata if provided as a guide.

## language (required, string or null)
Primary language of lyrics. Lowercase. Examples: "english", "spanish", "french", "korean", "japanese", "portuguese", "german", "italian", "arabic", "hindi", "chinese", "swedish", "turkish". Use "instrumental" when there are no lyrics. Use "unknown" only when language cannot be determined.

## era (required, string or null)
Musical era based on production style and release context. Examples: "2020s", "2010s", "2000s", "90s", "80s", "70s", "60s", "classic" (pre-1960s or timeless). Infer from metadata if available; otherwise use production cues.

## domainName (string or null)
High-level genre domain. Infer from spotifyGenres when provided. Examples: "Pop", "Rock", "Hip-Hop", "R&B", "Electronic", "Jazz", "Classical", "Folk", "Country", "Latin", "Metal", "Indie", "Soul", "Funk", "Reggae", "World". Use null if genre is unclear or too eclectic.

# Guidelines

1. **Lyrics first**: When lyrics are provided, they are the primary signal for mood, themes, topics, and vibe. Read them carefully.
2. **Inference without lyrics**: When lyrics are null, infer from: artist name, track name, album name, spotifyGenres, and valence/energy/danceability/tempo.
3. **Be specific**: Prefer concrete terms over vague ones. "late night drive through the city" > "chill".
4. **Consistency**: Use similar vocabulary across tracks in the batch when the same concept applies.
5. **Order matters**: Return results in the exact same order as the input. Match by position, not by content.
6. **No hallucination**: Only include themes/topics/vibes you can justify from the input. Empty arrays are fine.
7. **Output format**: Return a JSON object with a \`results\` array. Each element is one classification object. Output valid JSON only—no markdown, no code blocks, no extra text.

# Input Tracks (JSON)

${JSON.stringify(tracks)}`;
}

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
			try {
				const { output } = await generateText({
					model: groq("openai/gpt-oss-120b"),
					prompt: buildClassificationPrompt(tracks),
					temperature: 0,
					output: Output.object({
						schema: classificationResultListSchema,
					}),
				});

				for (const item of output.results) {
					if (!item.trackId) {
						logger.warn(
							{ item },
							"LLM classification result missing trackId; this item will be ignored",
						);
					}
				}

				return output.results;
			} catch (err) {
				if (NoObjectGeneratedError.isInstance(err)) {
					const e = err as { text?: string; cause?: unknown };
					const failedText =
						e.text ??
						(typeof e.cause === "object" &&
						e.cause !== null &&
						"failed_generation" in e.cause
							? String(
									(e.cause as { failed_generation?: string }).failed_generation,
								)
							: undefined);
					logger.warn(
						{
							errorMessage: err.message,
							rawOutput: failedText,
							cause: e.cause,
						},
						"LLM returned invalid JSON; see rawOutput for model output",
					);
				}
				throw err;
			}
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
