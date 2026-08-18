import {
	getActiveProvider,
	getAIModel,
	getModelId,
	isProviderConfigured,
	isSplitRetryableError,
	logInvalidJsonError,
	withLLMRetry,
} from "@harmonia/ai-provider";
import {
	type ClassificationResult,
	classificationResultListSchema,
	type TrackForClassification,
} from "@harmonia/common/schemas";
import { logger } from "@harmonia/logger";
import { llml as formatPrompt } from "@zenbase/llml";
import { APICallError, generateText, Output } from "ai";

import { logExternalApiCall } from "../external-api-log";

const CLASSIFICATION_MAX_OUTPUT_TOKENS = 8192;
const CLASSIFICATION_RETRIES = 5;

export type LLMCallContext = {
	userId?: string | null;
	pipelineRunId?: number | null;
};

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

async function classifyTracksBatchOnce(
	tracks: TrackForClassification[],
	context: LLMCallContext,
	retryAttempt: number,
): Promise<ClassificationResult[]> {
	const provider = getActiveProvider();
	const modelId = getModelId("classification");
	const startTime = Date.now();
	try {
		const { output, usage, response } = await generateText({
			model: getAIModel("classification"),
			prompt: buildClassificationPrompt(tracks),
			temperature: 0,
			maxOutputTokens: CLASSIFICATION_MAX_OUTPUT_TOKENS,
			output: Output.object({
				schema: classificationResultListSchema,
			}),
		});
		const durationMs = Date.now() - startTime;

		logger.info(
			{
				provider,
				model: modelId,
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

		// Prompt text and per-track metadata are never logged (large,
		// contains user library data) — only counts and token usage.
		await logExternalApiCall({
			userId: context.userId,
			pipelineRunId: context.pipelineRunId,
			provider,
			endpoint: modelId,
			method: "POST",
			httpStatus: 200,
			requestPayload: {
				model: modelId,
				trackCount: tracks.length,
			},
			responsePayload: {
				usage,
				resultCount: output.results.length,
				responseId: response?.id,
			},
			durationMs,
			retryAttempt,
		});

		return output.results;
	} catch (err) {
		logInvalidJsonError(err);
		const durationMs = Date.now() - startTime;
		const httpStatus = APICallError.isInstance(err)
			? err.statusCode
			: undefined;
		await logExternalApiCall({
			userId: context.userId,
			pipelineRunId: context.pipelineRunId,
			provider,
			endpoint: modelId,
			method: "POST",
			httpStatus,
			requestPayload: {
				model: modelId,
				trackCount: tracks.length,
			},
			durationMs,
			errorMessage: err instanceof Error ? err.message : String(err),
			// The Vercel AI SDK's generateText() doesn't always surface a raw
			// HTTP status (e.g. NoObjectGeneratedError has none) — default the
			// bucket to server_error rather than the generic "no status" case,
			// since these are provider-side failures, not client/request errors.
			statusCategory: httpStatus ? undefined : "server_error",
			retryAttempt,
		});
		throw err;
	}
}

async function classifyTracksAdaptive(
	tracks: TrackForClassification[],
	context: LLMCallContext,
): Promise<ClassificationResult[]> {
	try {
		return await withLLMRetry(
			(attemptCount) =>
				classifyTracksBatchOnce(tracks, context, attemptCount - 1),
			{ retries: CLASSIFICATION_RETRIES, label: "classification" },
		);
	} catch (err) {
		if (tracks.length <= 1 || !isSplitRetryableError(err)) {
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
			classifyTracksAdaptive(tracks.slice(0, mid), context),
			classifyTracksAdaptive(tracks.slice(mid), context),
		]);
		return [...left, ...right];
	}
}

export async function classifyTracksWithLLM(
	tracks: TrackForClassification[],
	context: LLMCallContext = {},
): Promise<ClassificationResult[]> {
	if (!isProviderConfigured()) {
		logger.warn(
			{ type: "llml", provider: getActiveProvider() },
			"No credentials configured for the active AI provider; skipping LLM classification and returning empty results",
		);
		return [];
	}

	return classifyTracksAdaptive(tracks, context);
}
