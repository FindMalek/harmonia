import { z } from "zod";

/** Matches LlmTags type from @harmonia/common/types. Used for validation and API output. */
export const llmTagsSchema = z.object({
	secondaryMoods: z.array(z.string()),
	themes: z.array(z.string()),
	topics: z.array(z.string()),
	vibe: z.array(z.string()),
	vocalType: z.string(),
	energyLevel: z.string(),
	language: z.string(),
	era: z.string(),
});

const trackListItemSchema = z.object({
	id: z.string(),
	name: z.string(),
	artistNames: z.string(),
	albumName: z.string().nullable(),
	durationMs: z.number().nullable(),
	lyricsStatus: z.string().nullable(),
	llmMood: z.string().nullable(),
	llmTags: llmTagsSchema.nullable(),
	llmClassifiedAt: z.date().nullable(),
	embeddingGeneratedAt: z.date().nullable(),
	createdAt: z.date(),
});

export const tracksListOutputSchema = z.object({
	tracks: z.array(trackListItemSchema),
	total: z.number(),
	page: z.number(),
	pageSize: z.number(),
});
export type TracksListOutput = z.infer<typeof tracksListOutputSchema>;

export const trackGetByIdOutputSchema = z.object({
	id: z.string(),
	userId: z.string(),
	spotifyUri: z.string(),
	name: z.string(),
	artistNames: z.string(),
	albumName: z.string().nullable(),
	durationMs: z.number().nullable(),
	spotifyGenres: z.array(z.string()).nullable(),
	genreDomainId: z.number().nullable(),
	valence: z.number().nullable(),
	energy: z.number().nullable(),
	danceability: z.number().nullable(),
	tempo: z.number().nullable(),
	acousticness: z.number().nullable(),
	instrumentalness: z.number().nullable(),
	speechiness: z.number().nullable(),
	liveness: z.number().nullable(),
	key: z.number().nullable(),
	mode: z.number().nullable(),
	lyrics: z.string().nullable(),
	syncedLyrics: z.string().nullable(),
	lyricsInstrumental: z.boolean().nullable(),
	lrclibId: z.number().nullable(),
	lyricsFetchedAt: z.date().nullable(),
	lyricsStatus: z.string().nullable(),
	llmMood: z.string().nullable(),
	llmTags: llmTagsSchema.nullable(),
	llmClassifiedAt: z.date().nullable(),
	embeddingGeneratedAt: z.date().nullable(),
	domainAssignedAt: z.date().nullable(),
	analysisSnapshot: z
		.object({
			llm: z.record(z.string(), z.unknown()),
			domain: z.string().nullable(),
			embeddingDims: z.number().optional(),
			modelVersions: z
				.object({
					llm: z.string().optional(),
					embedding: z.string().optional(),
				})
				.optional(),
		})
		.nullable(),
	createdAt: z.date(),
	updatedAt: z.date(),
	clusterId: z.number().nullable(),
	embedding: z.undefined().optional(),
});
export type TrackGetByIdOutput = z.infer<typeof trackGetByIdOutputSchema>;
