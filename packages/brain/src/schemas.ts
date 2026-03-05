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
	mood: z.string().nullable().optional(),
	secondaryMoods: z.array(z.string()).default([]),
	themes: z.array(z.string()).default([]),
	topics: z.array(z.string()).default([]),
	vibe: z.array(z.string()).default([]),
	vocalType: z.string().nullable().default("unknown"),
	energyLevel: z.string().nullable().optional(),
	language: z.string().nullable().optional(),
	era: z.string().nullable().optional(),
	domainName: z.string().nullable().optional(),
});

export type ClassificationResult = z.infer<typeof classificationResultSchema>;

export const classificationResultListSchema = z.array(
	classificationResultSchema,
);

export const clusterMetadataSchema = z.object({
	themeSummary: z.string(),
	dominantMood: z.string(),
	dominantEnergy: z.string(),
	topThemes: z.array(z.string()),
	topVibes: z.array(z.string()),
	suggestedArchetype: z.enum(["mood", "situation", "genre", "hybrid"]),
});

export type ClusterMetadata = z.infer<typeof clusterMetadataSchema>;

export const playlistMetadataSchema = z.object({
	name: z.string(),
	description: z.string(),
	taxonomy: z.enum(["mood", "situation", "genre", "hybrid"]),
	coverColor: z.string(),
});

export type PlaylistMetadata = z.infer<typeof playlistMetadataSchema>;
