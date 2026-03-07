import { z } from "zod";

const trackListItemSchema = z.object({
	id: z.string(),
	name: z.string(),
	artistNames: z.string(),
	albumName: z.string().nullable(),
	durationMs: z.number().nullable(),
	lyricsStatus: z.string().nullable(),
	llmMood: z.string().nullable(),
	llmTags: z.record(z.string(), z.unknown()).nullable(),
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
	llmTags: z.record(z.string(), z.unknown()).nullable(),
	llmClassifiedAt: z.date().nullable(),
	embeddingGeneratedAt: z.date().nullable(),
	domainAssignedAt: z.date().nullable(),
	analysisSnapshot: z.record(z.string(), z.unknown()).nullable(),
	createdAt: z.date(),
	updatedAt: z.date(),
	clusterId: z.number().nullable(),
	embedding: z.undefined().optional(),
});
export type TrackGetByIdOutput = z.infer<typeof trackGetByIdOutputSchema>;
