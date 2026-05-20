import { createGroq } from "@ai-sdk/groq";
import { env } from "@harmonia/env/server";
import { logger } from "@harmonia/logger";
import { llml as formatPrompt } from "@zenbase/llml";
import { APICallError, NoObjectGeneratedError, Output, generateText } from "ai";
import pRetry, { AbortError } from "p-retry";

import {
	type ClassificationResult,
	type TrackForClassification,
	classificationResultListSchema,
} from "@harmonia/common/schemas";

import {
	CLASSIFICATION_LLM_MODEL,
	CLASSIFICATION_MAX_OUTPUT_TOKENS,
	GROQ_RATE_LIMIT_FALLBACK_DELAY_MS,
} from "../../constants/brain";

function buildClassificationPrompt(tracks: TrackForClassification[]): string {
	return formatPrompt({
		role: "You are an expert music analyst and curator with deep knowledge of genres, lyrical themes, production styles, and listener psychology. Your job is to analyze tracks and produce consistent, richly descriptive classifications that will power music discovery and playlist generation.",
		task: "Analyze each track in the input batch and return one classification object per track. Preserve the exact input order—output array index N must correspond to input track index N. Copy each track's id as trackId exactly.",
		outputFields: {
			mood: "The primary emotional quality of the track. Choose ONE word or short phrase. Prefer from this vocabulary when applicable: melancholic, euphoric, nostalgic, bittersweet, somber, triumphant, brooding, wistful, hopeful, cynical, anxious, serene, cathartic, vulnerable, defiant, empowered, resigned, yearning, joyful. Energy: aggressive, intense, chaotic, meditative, laid-back, mellow, energetic, subdued, explosive, hypnotic, frenetic, calm, restless. Tone: dreamy, dark, playful, romantic, sensual, haunting, uplifting, gritty, ethereal, earthy, cosmic, raw. Use null only if purely instrumental with no inferable mood.",
			secondaryMoods:
				"Complementary moods (array, 0-3 items). Pick from same vocabulary. Avoid duplicating primary mood. Can be empty.",
			themes:
				"Broad lyrical or conceptual themes (array, 0-5 items). Examples: love, loss, heartbreak, hope, despair, nostalgia, freedom, struggle, longing; self-discovery, identity, coming of age, growth, disillusionment, rebellion, escapism; relationships, friendship, family, community, isolation, belonging, protest, politics; spirituality, mortality, purpose, fate, transcendence, solitude; urban life, nature, travel, home, the road, night, the city.",
			topics:
				"Concrete subject matter (array, 0-5 items). Examples: relationships, breakups, romance, nightlife, partying, mental health, addiction, healing; politics, social commentary, inequality, activism, culture, fame; work, ambition, success, failure, money, lifestyle, sports, cars; introspection, depression, anxiety, empowerment, vulnerability, confidence; summer, winter, rain, ocean, city, countryside, road trip, club, bedroom.",
			vibe: "When and where someone would typically listen (array, 0-5 items). Be specific. Examples: night drive, rainy day, workout, gym, running, late night study, cooking, cleaning, morning coffee; beach day, pool party, backyard BBQ, rooftop sunset, cabin in the woods; crying in bed, dancing alone, pre-game, post-breakup, date night; summer road trip, winter cozy, city commute, forest walk, beach bonfire; party, chill hangout, focus work, meditation, getting ready, winding down.",
			vocalType:
				'Exactly one of: "instrumental" | "female vocal" | "male vocal" | "mixed" | "unknown". Use instrumental only when no sung or spoken vocals. Use mixed for male + female or featured artists.',
			energyLevel:
				'Exactly one of: "very low" | "low" | "medium" | "high" | "very high". Align with track intensity and pace. Use valence/energy/danceability from metadata if provided.',
			language:
				'Primary language of lyrics. Lowercase. Examples: english, spanish, french, korean, japanese, portuguese, german, italian, arabic, hindi, chinese, swedish, turkish. Use "instrumental" when no lyrics. Use "unknown" when cannot determine.',
			era: "Musical era from production style. Examples: 2020s, 2010s, 2000s, 90s, 80s, 70s, 60s, classic (pre-1960s). Infer from metadata if available.",
			domainName:
				"High-level genre domain. Infer from spotifyGenres. Examples: Pop, Rock, Hip-Hop, R&B, Electronic, Jazz, Classical, Folk, Country, Latin, Metal, Indie, Soul, Funk, Reggae, World. Use null if unclear or too eclectic.",
		},
		guidelines: [
			"Lyrics first: When lyrics are provided, they are the primary signal for mood, themes, topics, and vibe. Read them carefully.",
			"Inference without lyrics: When lyrics are null, infer from artist name, track name, album name, spotifyGenres, and valence/energy/danceability/tempo.",
			"Be specific: Prefer concrete terms over vague ones. late night drive through the city > chill.",
			"Consistency: Use similar vocabulary across tracks in the batch when the same concept applies.",
			"Order matters: Return results in the exact same order as the input. Match by position, not by content.",
			"No hallucination: Only include themes/topics/vibes you can justify from the input. Empty arrays are fine.",
			"Output format: Return a JSON object with a results array. Each element is one classification object. Output valid JSON only—no markdown, no code blocks, no extra text.",
		],
		inputTracks: tracks,
	});
}

function isRetryableJsonError(err: unknown): boolean {
	if (NoObjectGeneratedError.isInstance(err)) return true;
	const message = err instanceof Error ? err.message : String(err);
	return (
		message.includes("Failed to validate JSON") ||
		message.includes("No output generated")
	);
}

function logInvalidJsonError(err: unknown): void {
	if (!NoObjectGeneratedError.isInstance(err)) return;
	const e = err as { text?: string; cause?: unknown };
	const failedText =
		e.text ??
		(typeof e.cause === "object" &&
		e.cause !== null &&
		"failed_generation" in e.cause
			? String((e.cause as { failed_generation?: string }).failed_generation)
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

async function classifyTracksBatchOnce(
	tracks: TrackForClassification[],
): Promise<ClassificationResult[]> {
	try {
		const groq = createGroq({ apiKey: env.HARMONIA_GROQ_API_KEY });
		const { output } = await generateText({
			model: groq(CLASSIFICATION_LLM_MODEL),
			prompt: buildClassificationPrompt(tracks),
			temperature: 0,
			maxOutputTokens: CLASSIFICATION_MAX_OUTPUT_TOKENS,
			output: Output.object({
				schema: classificationResultListSchema,
			}),
		});

		logger.info(
			{
				model: CLASSIFICATION_LLM_MODEL,
				batchSize: tracks.length,
				trackIds: tracks.map((t) => t.id),
			},
			"LLM classification batch succeeded",
		);

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
		logInvalidJsonError(err);
		throw err;
	}
}

function isRateLimit(err: unknown): err is APICallError {
	return APICallError.isInstance(err) && err.statusCode === 429;
}

function getRateLimitDelayMs(err: APICallError): number {
	const retryAfter = err.responseHeaders?.["retry-after"];
	if (retryAfter) {
		const seconds = Number(retryAfter);
		if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;
	}
	return GROQ_RATE_LIMIT_FALLBACK_DELAY_MS;
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function classifyTracksAdaptive(
	tracks: TrackForClassification[],
): Promise<ClassificationResult[]> {
	try {
		return await pRetry(
			async () => {
				try {
					return await classifyTracksBatchOnce(tracks);
				} catch (err) {
					if (isRateLimit(err)) {
						const delayMs = getRateLimitDelayMs(err);
						logger.warn(
							{
								batchSize: tracks.length,
								delayMs,
								retryAfterHeader: err.responseHeaders?.["retry-after"],
							},
							"Groq rate limit (429); sleeping before retry",
						);
						await sleep(delayMs);
						throw err;
					}
					// Hard 4xx (not 429) — abort immediately, don't waste retries
					if (
						APICallError.isInstance(err) &&
						err.statusCode !== undefined &&
						err.statusCode >= 400 &&
						err.statusCode < 500
					) {
						throw new AbortError(
							err instanceof Error ? err.message : String(err),
						);
					}
					throw err;
				}
			},
			{
				retries: 5,
				minTimeout: 1000,
				randomize: true,
				onFailedAttempt: (error) => {
					logger.warn(
						{
							attempt: error.attemptNumber,
							retriesLeft: error.retriesLeft,
							batchSize: tracks.length,
							error: String(error),
						},
						"LLM classification failed, retrying",
					);
				},
			},
		);
	} catch (err) {
		if (tracks.length <= 1 || !isRetryableJsonError(err)) {
			throw err;
		}

		const mid = Math.ceil(tracks.length / 2);
		logger.warn(
			{
				originalSize: tracks.length,
				splitInto: [mid, tracks.length - mid],
			},
			"LLM classification batch failed after retries; splitting batch",
		);

		const [left, right] = await Promise.all([
			classifyTracksAdaptive(tracks.slice(0, mid)),
			classifyTracksAdaptive(tracks.slice(mid)),
		]);
		return [...left, ...right];
	}
}

export async function classifyTracksWithLLM(
	tracks: TrackForClassification[],
): Promise<ClassificationResult[]> {
	if (!env.HARMONIA_GROQ_API_KEY) {
		logger.warn(
			{ type: "llml" },
			"No HARMONIA_GROQ_API_KEY configured; skipping LLM classification and returning empty results",
		);
		return [];
	}

	return classifyTracksAdaptive(tracks);
}
