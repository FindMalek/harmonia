import { z } from "zod";

export const trackForClassificationSchema = z.object({
	id: z.string(),
	name: z.string(),
	artistNames: z.array(z.string()),
	albumName: z.string().nullable(),
	durationMs: z.number().nullable(),
	spotifyGenres: z.array(z.string()).nullable(),
	lyrics: z.string().nullable(),
	valence: z.number().nullable(),
	energy: z.number().nullable(),
	danceability: z.number().nullable(),
	tempo: z.number().nullable(),
});

export type TrackForClassification = z.infer<
	typeof trackForClassificationSchema
>;

export const classificationResultSchema = z.object({
	trackId: z.string(),
	mood: z.string().nullable(),
	secondaryMoods: z.array(z.string()),
	themes: z.array(z.string()),
	topics: z.array(z.string()),
	vibe: z.array(z.string()),
	vocalType: z.string().nullable(),
	energyLevel: z.string().nullable(),
	language: z.string().nullable(),
	era: z.string().nullable(),
	domainName: z.string().nullable(),
});

export type ClassificationResult = z.infer<typeof classificationResultSchema>;

export const classificationResultListSchema = z.object({
	results: z.array(classificationResultSchema),
});
