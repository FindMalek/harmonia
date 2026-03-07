import { db } from "@harmonia/db";
import { track } from "@harmonia/db/schema/track";
import { env } from "@harmonia/env/server";
import { logger } from "@harmonia/logger";
import { and, eq, isNull } from "drizzle-orm";
import pRetry from "p-retry";

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_BATCH_SIZE = 64;

type OpenAIEmbeddingResponse = {
	data: Array<{
		embedding: number[];
	}>;
};

export type EmbedProgress = {
	embedded: number;
	total: number;
	pending: number;
};

export async function embedTracksBatch(
	userId: string,
	onProgress?: (progress: EmbedProgress) => Promise<void>,
): Promise<EmbedProgress> {
	const stats: EmbedProgress = { embedded: 0, total: 0, pending: 0 };

	if (!env.OPENAI_API_KEY) {
		logger.warn(
			{},
			"No OPENAI_API_KEY configured; skipping embedding generation",
		);
		return stats;
	}

	for (;;) {
		const pendingTracks = await db
			.select()
			.from(track)
			.where(and(eq(track.userId, userId), isNull(track.embedding)))
			.limit(EMBEDDING_BATCH_SIZE);

		if (pendingTracks.length === 0) break;

		stats.pending = pendingTracks.length;

		logger.info(
			{ userId, batchSize: pendingTracks.length, embedded: stats.embedded },
			"Starting embedding batch",
		);

		const inputs = pendingTracks.map((t) => {
			const artistNames: string[] = JSON.parse(t.artistNames) ?? [];
			const tags = (t.llmTags as Record<string, unknown>) ?? {};

			const parts = [`Title: ${t.name}`, `Artists: ${artistNames.join(", ")}`];

			if (t.albumName) {
				parts.push(`Album: ${t.albumName}`);
			}

			if (t.llmMood) {
				parts.push(`Mood: ${t.llmMood}`);
			}

			const secondaryMoods = tags.secondaryMoods as string[] | undefined;
			if (secondaryMoods?.length) {
				parts.push(`Secondary moods: ${secondaryMoods.join(", ")}`);
			}

			const themes = tags.themes as string[] | undefined;
			if (themes?.length) {
				parts.push(`Themes: ${themes.join(", ")}`);
			}

			const topics = tags.topics as string[] | undefined;
			if (topics?.length) {
				parts.push(`Topics: ${topics.join(", ")}`);
			}

			const vibe = tags.vibe as string[] | undefined;
			if (vibe?.length) {
				parts.push(`Vibe: ${vibe.join(", ")}`);
			}

			const vocalType = tags.vocalType as string | undefined;
			if (vocalType) {
				parts.push(`Vocal: ${vocalType}`);
			}

			const energyLevel = tags.energyLevel as string | undefined;
			if (energyLevel) {
				parts.push(`Energy: ${energyLevel}`);
			}

			const language = tags.language as string | undefined;
			if (language) {
				parts.push(`Language: ${language}`);
			}

			const era = tags.era as string | undefined;
			if (era) {
				parts.push(`Era: ${era}`);
			}

			const text = parts.join(" | ");

			return {
				id: t.id,
				text,
			};
		});

		const json = await pRetry(
			async () => {
				const response = await fetch("https://api.openai.com/v1/embeddings", {
					method: "POST",
					headers: {
						Authorization: `Bearer ${env.OPENAI_API_KEY}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						model: EMBEDDING_MODEL,
						input: inputs.map((i) => i.text),
					}),
				});

				if (!response.ok) {
					const text = await response.text();
					throw new Error(
						`OpenAI embeddings ${response.status}: ${text.slice(0, 200)}`,
					);
				}

				return (await response.json()) as OpenAIEmbeddingResponse;
			},
			{
				retries: 3,
				minTimeout: 2000,
				onFailedAttempt: (error) => {
					logger.warn(
						{
							attempt: error.attemptNumber,
							retriesLeft: error.retriesLeft,
						},
						"OpenAI embeddings request failed, retrying",
					);
				},
			},
		);

		if (!json.data || json.data.length !== inputs.length) {
			logger.error(
				{ expected: inputs.length, actual: json.data?.length },
				"Embedding response length mismatch",
			);
			break;
		}

		const now = new Date();

		for (let index = 0; index < inputs.length; index++) {
			const input = inputs[index];
			const embedding = json.data[index]?.embedding;

			if (!input || !embedding) continue;

			await db
				.update(track)
				.set({
					embedding,
					embeddingGeneratedAt: now,
					embeddingInput: input.text,
					analysisSnapshot: {
						llm: {},
						domain: null,
						embeddingDims: embedding.length,
						modelVersions: {
							embedding: EMBEDDING_MODEL,
						},
					},
				})
				.where(and(eq(track.userId, userId), eq(track.id, input.id)));
		}

		stats.embedded += inputs.length;
		stats.total += inputs.length;

		if (onProgress) {
			await onProgress(stats);
		}
	}

	logger.info(
		{ userId, embedded: stats.embedded },
		"Completed embedding generation for all pending tracks",
	);

	return stats;
}
