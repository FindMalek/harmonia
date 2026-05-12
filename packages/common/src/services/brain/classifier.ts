import type {
	ClassificationResult,
	TrackForClassification,
} from "@harmonia/common/schemas";
import type { ClassifyProgress } from "@harmonia/common/types";
import { db } from "@harmonia/db";
import { genreDomain } from "@harmonia/db/schema/genre-domain";
import { track } from "@harmonia/db/schema/track";
import { logger } from "@harmonia/logger";
import { and, eq, inArray, isNull } from "drizzle-orm";
import pLimit from "p-limit";

import {
	CLASSIFICATION_BATCH_SIZE,
	CLASSIFICATION_CONCURRENCY,
} from "../../constants/brain";
import { classifyTracksWithLLM } from "./llml";

function chunk<T>(arr: T[], size: number): T[][] {
	const chunks: T[][] = [];
	for (let i = 0; i < arr.length; i += size) {
		chunks.push(arr.slice(i, i + size));
	}
	return chunks;
}

export async function classifyTracksBatch(
	userId: string,
	onProgress?: (progress: ClassifyProgress) => Promise<void>,
): Promise<ClassifyProgress> {
	const allPending = await db
		.select({ id: track.id })
		.from(track)
		.where(
			and(
				eq(track.userId, userId),
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
							eq(track.userId, userId),
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
						artistNames: JSON.parse(t.artistNames) ?? [],
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

				for (const { trackId, result, genreDomainId } of updates) {
					await db
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
							llmClassifiedAt: new Date(),
							genreDomainId: genreDomainId ?? null,
							domainAssignedAt: genreDomainId ? new Date() : null,
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
									llm: "openai/gpt-oss-120b",
								},
							},
						})
						.where(and(eq(track.userId, userId), eq(track.id, trackId)));
				}

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
