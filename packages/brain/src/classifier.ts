import { db } from "@harmonia/db";
import { genreDomain } from "@harmonia/db/schema/genre-domain";
import { track } from "@harmonia/db/schema/track";
import { logger } from "@harmonia/logger";
import { and, eq, inArray, isNull } from "drizzle-orm";

import type { ClassificationResult, TrackForClassification } from "./schemas";
import { classifyTracksWithLLM } from "./llml";

const CLASSIFICATION_BATCH_SIZE = 25;

export async function classifyTracksBatch(userId: string): Promise<void> {
	const pendingTracks = await db
		.select()
		.from(track)
		.where(
			and(
				eq(track.userId, userId),
				isNull(track.llmClassifiedAt),
				// Require at least some source material: lyrics or basic metadata
				isNull(track.lyricsStatus),
			),
		)
		.limit(CLASSIFICATION_BATCH_SIZE);

	if (pendingTracks.length === 0) {
		logger.info({ userId }, "No tracks pending LLM classification");
		return;
	}

	logger.info(
		{ userId, count: pendingTracks.length },
		"Starting LLM classification batch",
	);

	const trackInputs: TrackForClassification[] = pendingTracks.map((t) => ({
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
	}));

	const results = await classifyTracksWithLLM(trackInputs);

	if (results.length === 0) {
		logger.warn(
			{ userId },
			"LLM classification returned no results; skipping updates",
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

		const genreDomainId =
			result.domainName && domainByName.get(result.domainName)
				? domainByName.get(result.domainName)!
				: null;

		updates.push({
			trackId: result.trackId,
			result,
			genreDomainId,
		});
	}

	for (const { trackId, result, genreDomainId } of updates) {
		await db
			.update(track)
			.set({
				llmMood: result.mood ?? null,
				llmTags: {
					secondaryMoods: result.secondaryMoods ?? [],
					themes: result.themes ?? [],
					vocalType: result.vocalType ?? "unknown",
					energyLevel: result.energyLevel ?? null,
				},
				llmClassifiedAt: new Date(),
				genreDomainId: genreDomainId ?? null,
				domainAssignedAt: genreDomainId ? new Date() : null,
				analysisSnapshot: {
					llm: {
						mood: result.mood,
						secondaryMoods: result.secondaryMoods ?? [],
						themes: result.themes ?? [],
						vocalType: result.vocalType ?? "unknown",
						energyLevel: result.energyLevel ?? null,
						domainName: result.domainName ?? null,
					},
					domain: genreDomainId ?? null,
					embeddingDims: undefined,
					modelVersions: {
						llm: "groq/gpt-oss-120b",
					},
				},
			})
			.where(and(eq(track.userId, userId), eq(track.id, trackId)));
	}

	logger.info(
		{ userId, updated: updates.length },
		"Completed LLM classification batch",
	);
}
