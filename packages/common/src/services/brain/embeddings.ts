import type { EmbedProgress } from "@harmonia/common/types";
import { db } from "@harmonia/db";
import { track, userTracks } from "@harmonia/db/schema/track";
import { env } from "@harmonia/env/server";
import { logger } from "@harmonia/logger";
import { and, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import pLimit from "p-limit";
import pRetry from "p-retry";

import {
	EMBEDDING_BATCH_SIZE,
	EMBEDDING_CONCURRENCY,
	EMBEDDING_MODEL,
} from "../../constants/brain";
import { chunk } from "../../trigger/utils/chunk";
import { buildEmbeddingInput } from "./build-embedding-input";

type OpenAIEmbeddingResponse = {
	data: Array<{
		embedding: number[];
	}>;
};

// pgvector requires raw SQL: Drizzle's update builder bypasses mapToDriverValue for
// vector columns, so ::vector and ::jsonb casts must be explicit. The AND embedding
// IS NULL guard makes the write idempotent across concurrent workers.
async function persistEmbedding(
	trackId: string,
	embeddingInput: string,
	analysisSnapshot: (typeof track.$inferSelect)["analysisSnapshot"],
	rawEmbedding: number[],
	now: Date,
): Promise<void> {
	const vecStr = `[${rawEmbedding.join(",")}]`;
	const snapshotJson = JSON.stringify({
		...(analysisSnapshot ?? {}),
		embeddingDims: rawEmbedding.length,
		modelVersions: {
			...(analysisSnapshot?.modelVersions ?? {}),
			embedding: EMBEDDING_MODEL,
			embeddingInputVersion: "v2",
		},
	});
	await db.execute(sql`
		UPDATE track
		SET
			embedding              = ${vecStr}::vector,
			embedding_generated_at = ${now},
			embedding_input        = ${embeddingInput},
			analysis_snapshot      = ${snapshotJson}::jsonb,
			updated_at             = NOW()
		WHERE id = ${trackId}
		  AND embedding IS NULL
	`);
}

type EmbedDeltaCallback = (deltaEmbedded: number) => Promise<void>;

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

	const userTrackIds = db
		.select({ trackId: userTracks.trackId })
		.from(userTracks)
		.where(eq(userTracks.userId, userId));

	const allPending = await db
		.select({ id: track.id })
		.from(track)
		.where(
			and(
				inArray(track.id, userTrackIds),
				isNull(track.embedding),
				isNotNull(track.llmClassifiedAt),
			),
		);

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
					.where(and(inArray(track.id, batchIds), isNull(track.embedding)));

				if (pendingTracks.length === 0) return;

				logger.info(
					{ userId, batchSize: pendingTracks.length, embedded },
					"Starting embedding batch",
				);

				const inputs = pendingTracks
					.map((t) => {
						const text = buildEmbeddingInput(t);
						if (!text) return null;
						return { id: t.id, text, analysisSnapshot: t.analysisSnapshot };
					})
					.filter((x): x is NonNullable<typeof x> => x !== null);

				if (inputs.length === 0) return;

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

				await Promise.all(
					inputs.map(async (input, index) => {
						const embedding = json.data[index]?.embedding;
						if (!input || !embedding) return;
						await persistEmbedding(
							input.id,
							input.text,
							input.analysisSnapshot,
							embedding,
							now,
						);
					}),
				);

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

/**
 * Generates embeddings for an explicit list of track IDs (fan-out worker entry point).
 * Re-checks embedding IS NULL AND llmClassifiedAt IS NOT NULL at DB level for idempotency.
 * Calls onBatchComplete with delta count after each internal OpenAI batch.
 */
export async function embedTrackIds(
	userId: string,
	trackIds: string[],
	onBatchComplete?: EmbedDeltaCallback,
): Promise<EmbedProgress> {
	const stats: EmbedProgress = {
		embedded: 0,
		total: trackIds.length,
		pending: trackIds.length,
	};

	if (!env.HARMONIA_OPENAI_API_KEY) {
		logger.warn(
			{ type: "embeddings" },
			"No HARMONIA_OPENAI_API_KEY configured; skipping embedding generation",
		);
		return stats;
	}

	if (trackIds.length === 0) return stats;

	const batches = chunk(trackIds, EMBEDDING_BATCH_SIZE);
	const limit = pLimit(EMBEDDING_CONCURRENCY);

	await Promise.all(
		batches.map((batchIds) =>
			limit(async () => {
				// Idempotency re-check + dependency guard: only embed classified tracks
				const pendingTracks = await db
					.select()
					.from(track)
					.where(
						and(
							inArray(track.id, batchIds),
							isNull(track.embedding),
							isNotNull(track.llmClassifiedAt),
						),
					);

				if (pendingTracks.length === 0) return;

				const inputs = pendingTracks
					.map((t) => {
						const text = buildEmbeddingInput(t);
						if (!text) return null;
						return { id: t.id, text, analysisSnapshot: t.analysisSnapshot };
					})
					.filter((x): x is NonNullable<typeof x> => x !== null);

				if (inputs.length === 0) return;

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
				await Promise.all(
					inputs.map(async (input, index) => {
						const embedding = json.data[index]?.embedding;
						if (!input || !embedding) return;
						await persistEmbedding(
							input.id,
							input.text,
							input.analysisSnapshot,
							embedding,
							now,
						);
					}),
				);

				stats.embedded += inputs.length;
				stats.pending = stats.total - stats.embedded;
				await onBatchComplete?.(inputs.length);
			}),
		),
	);

	logger.info({ userId, embedded: stats.embedded }, "embedTrackIds completed");
	return stats;
}
