import type { EmbedProgress } from "@harmonia/common/types";
import { llmFieldsFromAnalysis } from "@harmonia/common/types";
import { db } from "@harmonia/db";
import { track, userTracks } from "@harmonia/db/schema/track";
import { trackAnalysis } from "@harmonia/db/schema/track-analysis";
import { env } from "@harmonia/env/server";
import { logger } from "@harmonia/logger";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import pLimit from "p-limit";
import pRetry from "p-retry";

import {
	EMBEDDING_BATCH_SIZE,
	EMBEDDING_CONCURRENCY,
	EMBEDDING_MODEL,
} from "../../constants/brain";
import { chunk } from "../../trigger/utils/chunk";
import { logExternalApiCall } from "../external-api-log";
import { buildEmbeddingInput } from "./build-embedding-input";

type OpenAIEmbeddingResponse = {
	data: Array<{
		embedding: number[];
	}>;
	usage?: { prompt_tokens: number; total_tokens: number };
};

export type EmbeddingCallContext = {
	userId?: string | null;
	pipelineRunId?: number | null;
};

// Shared by embedTracksBatch and embedTrackIds — one chokepoint for the
// OpenAI request, retry, and logging. Never logs input texts or embedding
// vectors (too large) — only { model, inputCount } and usage stats.
async function fetchEmbeddingsBatch(
	inputTexts: string[],
	context: EmbeddingCallContext,
): Promise<OpenAIEmbeddingResponse> {
	let attempt = 0;
	return pRetry(
		async () => {
			const retryAttempt = attempt;
			attempt += 1;
			const startTime = Date.now();
			const response = await fetch("https://api.openai.com/v1/embeddings", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${env.HARMONIA_OPENAI_API_KEY}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					model: EMBEDDING_MODEL,
					input: inputTexts,
				}),
			});
			const durationMs = Date.now() - startTime;

			if (!response.ok) {
				const text = await response.text();
				const errorMessage = `OpenAI embeddings ${response.status}: ${text.slice(0, 200)}`;
				await logExternalApiCall({
					userId: context.userId,
					pipelineRunId: context.pipelineRunId,
					provider: "openai",
					endpoint: "/v1/embeddings",
					method: "POST",
					httpStatus: response.status,
					requestPayload: {
						model: EMBEDDING_MODEL,
						inputCount: inputTexts.length,
					},
					durationMs,
					errorMessage,
					retryAttempt,
				});
				throw new Error(errorMessage);
			}

			const json = (await response.json()) as OpenAIEmbeddingResponse;

			await logExternalApiCall({
				userId: context.userId,
				pipelineRunId: context.pipelineRunId,
				provider: "openai",
				endpoint: "/v1/embeddings",
				method: "POST",
				httpStatus: response.status,
				requestPayload: {
					model: EMBEDDING_MODEL,
					inputCount: inputTexts.length,
				},
				responsePayload: json.usage ? { usage: json.usage } : undefined,
				durationMs,
				retryAttempt,
			});

			return json;
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
}

// pgvector requires raw SQL: Drizzle's update builder bypasses mapToDriverValue for
// vector columns, so the ::vector cast must be explicit. The AND embedding
// IS NULL guard makes the write idempotent across concurrent workers.
async function persistEmbedding(
	trackId: string,
	embeddingInput: string,
	rawEmbedding: number[],
	now: Date,
): Promise<void> {
	const vecStr = `[${rawEmbedding.join(",")}]`;
	await db.execute(sql`
		UPDATE track
		SET
			embedding              = ${vecStr}::vector,
			embedding_generated_at = ${now},
			embedding_input        = ${embeddingInput},
			updated_at             = NOW()
		WHERE id = ${trackId}
		  AND embedding IS NULL
	`);
}

type EmbeddingInput = {
	id: string;
	text: string;
};

// analysisByTrackId is a separate lookup (not a JOIN) — fetched once per batch from
// track_analysis and merged here, since track's `.select()` shorthand doesn't mix
// cleanly with a joined table's columns without enumerating every track column.
function toEmbeddingInputs(
	pendingTracks: Array<Pick<typeof track.$inferSelect, "id">>,
	analysisByTrackId: Map<string, ReturnType<typeof llmFieldsFromAnalysis>>,
): EmbeddingInput[] {
	return pendingTracks
		.map((t) => {
			const { llmMood, llmTags } = analysisByTrackId.get(t.id) ?? {
				llmMood: null,
				llmTags: null,
			};
			const text = buildEmbeddingInput({ llmMood, llmTags });
			if (!text) {
				logger.warn(
					{ trackId: t.id },
					"Skipping embed: classified track produced no embedding input",
				);
				return null;
			}
			return { id: t.id, text };
		})
		.filter((x): x is NonNullable<typeof x> => x !== null);
}

async function fetchAnalysisByTrackId(
	trackIds: string[],
): Promise<Map<string, ReturnType<typeof llmFieldsFromAnalysis>>> {
	const rows = await db
		.select()
		.from(trackAnalysis)
		.where(inArray(trackAnalysis.trackId, trackIds));
	return new Map(rows.map((r) => [r.trackId, llmFieldsFromAnalysis(r)]));
}

type EmbedDeltaCallback = (deltaEmbedded: number) => Promise<void>;

export async function embedTracksBatch(
	userId: string,
	onProgress?: (progress: EmbedProgress) => Promise<void>,
	pipelineRunId?: number,
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

	const analyzedTrackIds = db
		.select({ trackId: trackAnalysis.trackId })
		.from(trackAnalysis);

	const allPending = await db
		.select({ id: track.id })
		.from(track)
		.where(
			and(
				inArray(track.id, userTrackIds),
				isNull(track.embedding),
				inArray(track.id, analyzedTrackIds),
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
					.select({ id: track.id })
					.from(track)
					.where(and(inArray(track.id, batchIds), isNull(track.embedding)));

				if (pendingTracks.length === 0) return;

				logger.info(
					{ userId, batchSize: pendingTracks.length, embedded },
					"Starting embedding batch",
				);

				const analysisByTrackId = await fetchAnalysisByTrackId(
					pendingTracks.map((t) => t.id),
				);
				const inputs = toEmbeddingInputs(pendingTracks, analysisByTrackId);
				if (inputs.length === 0) return;

				const json = await fetchEmbeddingsBatch(
					inputs.map((i) => i.text),
					{ userId, pipelineRunId },
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
						await persistEmbedding(input.id, input.text, embedding, now);
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

// Fan-out worker entry point; re-checks embedding IS NULL and a track_analysis row exists at DB level for idempotency.
export async function embedTrackIds(
	userId: string,
	trackIds: string[],
	onBatchComplete?: EmbedDeltaCallback,
	pipelineRunId?: number,
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
				const analyzedTrackIds = db
					.select({ trackId: trackAnalysis.trackId })
					.from(trackAnalysis);
				const pendingTracks = await db
					.select({ id: track.id })
					.from(track)
					.where(
						and(
							inArray(track.id, batchIds),
							isNull(track.embedding),
							inArray(track.id, analyzedTrackIds),
						),
					);

				if (pendingTracks.length === 0) return;

				const analysisByTrackId = await fetchAnalysisByTrackId(
					pendingTracks.map((t) => t.id),
				);
				const inputs = toEmbeddingInputs(pendingTracks, analysisByTrackId);
				if (inputs.length === 0) return;

				const json = await fetchEmbeddingsBatch(
					inputs.map((i) => i.text),
					{ userId, pipelineRunId },
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
						await persistEmbedding(input.id, input.text, embedding, now);
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
