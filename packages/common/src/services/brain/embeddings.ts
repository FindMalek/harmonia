import type { EmbedProgress } from "@harmonia/common/types";
import { getLlmTags } from "@harmonia/common/types";
import { db } from "@harmonia/db";
import { track } from "@harmonia/db/schema/track";
import { env } from "@harmonia/env/server";
import { logger } from "@harmonia/logger";
import { and, eq, inArray, isNull } from "drizzle-orm";
import pLimit from "p-limit";
import pRetry from "p-retry";

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_BATCH_SIZE = 64;
const EMBEDDING_CONCURRENCY = 3;

type OpenAIEmbeddingResponse = {
	data: Array<{
		embedding: number[];
	}>;
};

function chunk<T>(arr: T[], size: number): T[][] {
	const chunks: T[][] = [];
	for (let i = 0; i < arr.length; i += size) {
		chunks.push(arr.slice(i, i + size));
	}
	return chunks;
}

export async function embedTracksBatch(
	userId: string,
	onProgress?: (progress: EmbedProgress) => Promise<void>,
): Promise<EmbedProgress> {
	const stats: EmbedProgress = { embedded: 0, total: 0, pending: 0 };

	if (!env.HARMONIA_OPENAI_API_KEY) {
		logger.warn(
			{ type: "embeddings" },
			"No HARMONIA_OPENAI_API_KEY configured; skipping embedding generation",
		);
		return stats;
	}

	const allPending = await db
		.select({ id: track.id })
		.from(track)
		.where(and(eq(track.userId, userId), isNull(track.embedding)));

	const total = allPending.length;

	if (total === 0) {
		logger.info({ userId }, "No tracks pending embedding");
		return { embedded: 0, total: 0, pending: 0 };
	}

	const batches = chunk(
		allPending.map((t) => t.id),
		EMBEDDING_BATCH_SIZE,
	);
	let embedded = 0;
	const limit = pLimit(EMBEDDING_CONCURRENCY);

	await Promise.all(
		batches.map((batchIds) =>
			limit(async () => {
				const pendingTracks = await db
					.select()
					.from(track)
					.where(
						and(
							eq(track.userId, userId),
							inArray(track.id, batchIds),
							isNull(track.embedding),
						),
					);

				if (pendingTracks.length === 0) return;

				logger.info(
					{ userId, batchSize: pendingTracks.length, embedded },
					"Starting embedding batch",
				);

				const inputs = pendingTracks.map((t) => {
					const artistNames: string[] = JSON.parse(t.artistNames) ?? [];
					const tags = getLlmTags(t.llmTags);

					const parts = [
						`Title: ${t.name}`,
						`Artists: ${artistNames.join(", ")}`,
					];

					if (t.albumName) parts.push(`Album: ${t.albumName}`);
					if (t.llmMood) parts.push(`Mood: ${t.llmMood}`);
					if (tags.secondaryMoods?.length)
						parts.push(`Secondary moods: ${tags.secondaryMoods.join(", ")}`);
					if (tags.themes?.length)
						parts.push(`Themes: ${tags.themes.join(", ")}`);
					if (tags.topics?.length)
						parts.push(`Topics: ${tags.topics.join(", ")}`);
					if (tags.vibe?.length) parts.push(`Vibe: ${tags.vibe.join(", ")}`);
					if (tags.vocalType) parts.push(`Vocal: ${tags.vocalType}`);
					if (tags.energyLevel) parts.push(`Energy: ${tags.energyLevel}`);
					if (tags.language) parts.push(`Language: ${tags.language}`);
					if (tags.era) parts.push(`Era: ${tags.era}`);

					return { id: t.id, text: parts.join(" | ") };
				});

				const json = await pRetry(
					async () => {
						const response = await fetch(
							"https://api.openai.com/v1/embeddings",
							{
								method: "POST",
								headers: {
									Authorization: `Bearer ${env.HARMONIA_OPENAI_API_KEY}`,
									"Content-Type": "application/json",
								},
								body: JSON.stringify({
									model: EMBEDDING_MODEL,
									input: inputs.map((i) => i.text),
								}),
							},
						);

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
					return;
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
								modelVersions: { embedding: EMBEDDING_MODEL },
							},
						})
						.where(and(eq(track.userId, userId), eq(track.id, input.id)));
				}

				embedded += inputs.length;
				await onProgress?.({ embedded, total, pending: total - embedded });
			}),
		),
	);

	logger.info(
		{ userId, embedded },
		"Completed embedding generation for all pending tracks",
	);

	return { embedded, total, pending: 0 };
}
