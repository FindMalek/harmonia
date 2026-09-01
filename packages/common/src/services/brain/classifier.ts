import { getModelId } from "@sonaraem/ai-provider";
import type {
	ClassificationResult,
	TrackForClassification,
} from "@sonaraem/common/schemas";
import type { ClassifyProgress } from "@sonaraem/common/types";
import { db } from "@sonaraem/db";
import { genreDomain } from "@sonaraem/db/schema/genre-domain";
import { track } from "@sonaraem/db/schema/track";
import { trackAnalysis } from "@sonaraem/db/schema/track-analysis";
import { logger } from "@sonaraem/logger";
import { and, eq, inArray, notInArray } from "drizzle-orm";
import pLimit from "p-limit";

import { chunk } from "../../trigger/utils/chunk";
import { parseJsonStringArray } from "../../utils/parse-json-string-array";
import { classifyTracksWithLLM } from "./llml";

const CLASSIFICATION_BATCH_SIZE = 6;
const CLASSIFICATION_CONCURRENCY = 1;

type ClassifyDeltaCallback = (deltaClassified: number) => Promise<void>;

// Fan-out worker entry point; re-checks for an existing track_analysis row at DB level for idempotency, calling onBatchComplete with a delta count after each internal LLM batch.
export async function classifyTrackIds(
	userId: string,
	trackIds: string[],
	onBatchComplete?: ClassifyDeltaCallback,
	pipelineRunId?: number,
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
				// Idempotency re-check: skip tracks that already have an analysis row
				const analyzedTrackIds = db
					.select({ trackId: trackAnalysis.trackId })
					.from(trackAnalysis);
				const pendingTracks = await db
					.select()
					.from(track)
					.where(
						and(
							inArray(track.id, batchIds),
							notInArray(track.id, analyzedTrackIds),
						),
					);

				if (pendingTracks.length === 0) return;

				const trackInputs: TrackForClassification[] = pendingTracks.map(
					(t) => ({
						id: t.id,
						name: t.name,
						artistNames: parseJsonStringArray(t.artistNames),
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

				const results = await classifyTracksWithLLM(trackInputs, {
					userId,
					pipelineRunId,
				});

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
				if (updates.length > 0) {
					const modelId = getModelId("classification");
					// Append-only insert: fan-out assigns each track to one worker batch, a duplicate row only happens on genuine retry.
					await db.insert(trackAnalysis).values(
						updates.map(({ trackId, result }) => ({
							trackId,
							mood: result.mood ?? null,
							secondaryMoods: result.secondaryMoods ?? [],
							themes: result.themes ?? [],
							topics: result.topics ?? [],
							vibe: result.vibe ?? [],
							vocalType: result.vocalType ?? "unknown",
							energyLevel: result.energyLevel ?? "unknown",
							language: result.language ?? "unknown",
							era: result.era ?? "unknown",
							modelId,
							classifiedAt: now,
						})),
					);
					await Promise.all(
						updates.map(({ trackId, genreDomainId }) =>
							db
								.update(track)
								.set({
									genreDomainId: genreDomainId ?? null,
									domainAssignedAt: genreDomainId ? now : null,
								})
								.where(eq(track.id, trackId)),
						),
					);
				}

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
