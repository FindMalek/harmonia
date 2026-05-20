import type {
	ClassificationResult,
	TrackForClassification,
} from "@harmonia/common/schemas";
import type { ClassifyProgress } from "@harmonia/common/types";
import { db } from "@harmonia/db";
import { genreDomain } from "@harmonia/db/schema/genre-domain";
import { track, userTracks } from "@harmonia/db/schema/track";
import { logger } from "@harmonia/logger";
import { and, eq, inArray, isNull } from "drizzle-orm";
import pLimit from "p-limit";

import {
	CLASSIFICATION_BATCH_SIZE,
	CLASSIFICATION_CONCURRENCY,
	CLASSIFICATION_LLM_MODEL,
} from "../../constants/brain";
import { chunk } from "../../trigger/utils/chunk";
import { classifyTracksWithLLM } from "./llml";

type ClassifyDeltaCallback = (deltaClassified: number) => Promise<void>;

export async function classifyTracksBatch(
	userId: string,
	onProgress?: (progress: ClassifyProgress) => Promise<void>,
): Promise<ClassifyProgress> {
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
				isNull(track.llmClassifiedAt),
				inArray(track.lyricsStatus, ["found", "not_found"]),
			),
		);

	const total = allPending.length;
	const stats: ClassifyProgress = { classified: 0, total, pending: total };

	if (total === 0) {
		logger.info({ userId }, "No tracks pending classification");
		return stats;
	}

	const batches = chunk(
		allPending.map((t) => t.id),
		CLASSIFICATION_BATCH_SIZE,
	);
	let classified = 0;
	const limit = pLimit(CLASSIFICATION_CONCURRENCY);

	await Promise.all(
		batches.map((batchIds) =>
			limit(async () => {
				const pendingTracks = await db
					.select()
					.from(track)
					.where(
						and(
							inArray(track.id, batchIds),
							isNull(track.llmClassifiedAt),
						),
					);

				if (pendingTracks.length === 0) return;

				logger.info(
					{
						userId,
						batchSize: pendingTracks.length,
						classified,
					},
					"Starting LLM classification batch",
				);

				const trackInputs: TrackForClassification[] = pendingTracks.map(
					(t) => ({
						id: t.id,
						name: t.name,
						artistNames: t.artistNames ? JSON.parse(t.artistNames) : [],
						albumName: t.albumName,
						durationMs: t.durationMs,
						spotifyGenres: t.spotifyGenres ?? null,
						lyrics: t.lyrics ?? null,
						valence: t.valence ?? null,
						energy: t.energy ?? null,
						danceability: t.danceability ?? null,
						tempo: t.tempo ?? null,
					}),
				);

				const results = await classifyTracksWithLLM(trackInputs);

				if (results.length === 0) {
					logger.warn(
						{ userId },
						"LLM classification returned no results; skipping batch",
					);
					return;
				}

				const domainNames = Array.from(
					new Set(
						results
							.map((r) => r.domainName)
							.filter((name): name is string => !!name && name.length > 0),
					),
				);

				let domainByName = new Map<string, number>();

				if (domainNames.length > 0) {
					const domains = await db
						.select()
						.from(genreDomain)
						.where(inArray(genreDomain.name, domainNames));

					domainByName = new Map(domains.map((d) => [d.name, d.id]));
				}

				const updates: Array<{
					trackId: string;
					result: ClassificationResult;
					genreDomainId: number | null;
				}> = [];

				for (const result of results) {
					if (!result.trackId) continue;

					const domainId = result.domainName
						? domainByName.get(result.domainName)
						: undefined;
					const genreDomainId = domainId ?? null;

					updates.push({ trackId: result.trackId, result, genreDomainId });
				}

				const now = new Date();
				await Promise.all(
					updates.map(({ trackId, result, genreDomainId }) =>
						db
							.update(track)
							.set({
								llmMood: result.mood ?? null,
								llmTags: {
									secondaryMoods: result.secondaryMoods ?? [],
									themes: result.themes ?? [],
									topics: result.topics ?? [],
									vibe: result.vibe ?? [],
									vocalType: result.vocalType ?? "unknown",
									energyLevel: result.energyLevel ?? "unknown",
									language: result.language ?? "unknown",
									era: result.era ?? "unknown",
								},
								llmClassifiedAt: now,
								genreDomainId: genreDomainId ?? null,
								domainAssignedAt: genreDomainId ? now : null,
								analysisSnapshot: {
									llm: {
										mood: result.mood,
										secondaryMoods: result.secondaryMoods ?? [],
										themes: result.themes ?? [],
										topics: result.topics ?? [],
										vibe: result.vibe ?? [],
										vocalType: result.vocalType ?? "unknown",
										energyLevel: result.energyLevel ?? null,
										language: result.language ?? null,
										era: result.era ?? null,
										domainName: result.domainName ?? null,
									},
									domain: result.domainName ?? null,
									embeddingDims: undefined,
									modelVersions: {
										llm: CLASSIFICATION_LLM_MODEL,
									},
								},
							})
							.where(
										and(
											eq(track.id, trackId),
											isNull(track.llmClassifiedAt),
										),
									),
					),
				);

				classified += updates.length;
				await onProgress?.({
					classified,
					total,
					pending: total - classified,
				});
			}),
		),
	);

	logger.info(
		{ userId, classified },
		"Completed LLM classification for all pending tracks",
	);

	return { classified, total, pending: 0 };
}

/**
 * Classifies an explicit list of track IDs (fan-out worker entry point).
 * Re-checks llmClassifiedAt IS NULL at DB level for idempotency.
 * Calls onBatchComplete with delta count after each internal LLM batch.
 */
export async function classifyTrackIds(
	userId: string,
	trackIds: string[],
	onBatchComplete?: ClassifyDeltaCallback,
): Promise<ClassifyProgress> {
	const stats: ClassifyProgress = {
		classified: 0,
		total: trackIds.length,
		pending: trackIds.length,
	};

	if (trackIds.length === 0) return stats;

	const batches = chunk(trackIds, CLASSIFICATION_BATCH_SIZE);
	const limit = pLimit(CLASSIFICATION_CONCURRENCY);

	await Promise.all(
		batches.map((batchIds) =>
			limit(async () => {
				// Idempotency re-check: skip already-classified tracks
				const pendingTracks = await db
					.select()
					.from(track)
					.where(
						and(
							inArray(track.id, batchIds),
							isNull(track.llmClassifiedAt),
						),
					);

				if (pendingTracks.length === 0) return;

				const trackInputs: TrackForClassification[] = pendingTracks.map(
					(t) => ({
						id: t.id,
						name: t.name,
						artistNames: t.artistNames ? JSON.parse(t.artistNames) : [],
						albumName: t.albumName,
						durationMs: t.durationMs,
						spotifyGenres: t.spotifyGenres ?? null,
						lyrics: t.lyrics ?? null,
						valence: t.valence ?? null,
						energy: t.energy ?? null,
						danceability: t.danceability ?? null,
						tempo: t.tempo ?? null,
					}),
				);

				const results = await classifyTracksWithLLM(trackInputs);

				if (results.length === 0) {
					logger.warn(
						{ userId },
						"LLM classification returned no results; skipping batch",
					);
					return;
				}

				const domainNames = Array.from(
					new Set(
						results
							.map((r) => r.domainName)
							.filter((name): name is string => !!name && name.length > 0),
					),
				);

				let domainByName = new Map<string, number>();
				if (domainNames.length > 0) {
					const domains = await db
						.select()
						.from(genreDomain)
						.where(inArray(genreDomain.name, domainNames));
					domainByName = new Map(domains.map((d) => [d.name, d.id]));
				}

				const updates: Array<{
					trackId: string;
					result: ClassificationResult;
					genreDomainId: number | null;
				}> = [];

				for (const result of results) {
					if (!result.trackId) continue;
					const domainId = result.domainName
						? domainByName.get(result.domainName)
						: undefined;
					updates.push({
						trackId: result.trackId,
						result,
						genreDomainId: domainId ?? null,
					});
				}

				const now = new Date();
				await Promise.all(
					updates.map(({ trackId, result, genreDomainId }) =>
						db
							.update(track)
							.set({
								llmMood: result.mood ?? null,
								llmTags: {
									secondaryMoods: result.secondaryMoods ?? [],
									themes: result.themes ?? [],
									topics: result.topics ?? [],
									vibe: result.vibe ?? [],
									vocalType: result.vocalType ?? "unknown",
									energyLevel: result.energyLevel ?? "unknown",
									language: result.language ?? "unknown",
									era: result.era ?? "unknown",
								},
								llmClassifiedAt: now,
								genreDomainId: genreDomainId ?? null,
								domainAssignedAt: genreDomainId ? now : null,
								analysisSnapshot: {
									llm: {
										mood: result.mood,
										secondaryMoods: result.secondaryMoods ?? [],
										themes: result.themes ?? [],
										topics: result.topics ?? [],
										vibe: result.vibe ?? [],
										vocalType: result.vocalType ?? "unknown",
										energyLevel: result.energyLevel ?? null,
										language: result.language ?? null,
										era: result.era ?? null,
										domainName: result.domainName ?? null,
									},
									domain: result.domainName ?? null,
									embeddingDims: undefined,
									modelVersions: { llm: CLASSIFICATION_LLM_MODEL },
								},
							})
							.where(
										and(
											eq(track.id, trackId),
											isNull(track.llmClassifiedAt),
										),
									),
					),
				);

				stats.classified += updates.length;
				stats.pending = stats.total - stats.classified;
				await onBatchComplete?.(updates.length);
			}),
		),
	);

	logger.info(
		{ userId, classified: stats.classified },
		"classifyTrackIds completed",
	);
	return stats;
}
