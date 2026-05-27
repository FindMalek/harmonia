import { z } from "zod";

export const insightsSummarySchema = z.object({
	library: z.object({
		totalTracks: z.number(),
		uniqueArtists: z.number(),
		genreDomains: z.number(),
		generatedPlaylists: z.number(),
	}),
	personality: z
		.object({
			primaryMood: z.string().nullable(),
			secondaryMood: z.string().nullable(),
			favoriteEra: z.string().nullable(),
			eraDistribution: z.array(
				z.object({ era: z.string(), count: z.number() }),
			),
		})
		.nullable(),
	listening: z
		.object({
			topGenre: z.string().nullable(),
			topThemes: z.array(z.string()),
			avgEnergy: z.number().nullable(),
		})
		.nullable(),
	sonicDna: z
		.object({
			valence: z.number().nullable(),
			energy: z.number().nullable(),
			danceability: z.number().nullable(),
			acousticness: z.number().nullable(),
			instrumentalness: z.number().nullable(),
			speechiness: z.number().nullable(),
			liveness: z.number().nullable(),
		})
		.nullable(),
	moodDistribution: z.array(
		z.object({ mood: z.string(), count: z.number(), percentage: z.number() }),
	),
	topVibes: z.array(z.string()),
	genreBreakdown: z.array(
		z.object({ name: z.string(), count: z.number(), percentage: z.number() }),
	),
	emotionalLandscape: z
		.object({
			angryIntense: z.number(),
			euphoric: z.number(),
			darkBrooding: z.number(),
			chillHappy: z.number(),
		})
		.nullable(),
	playlistCoverage: z
		.object({
			percentage: z.number(),
			coveredTracks: z.number(),
			totalTracks: z.number(),
			totalPlaylists: z.number(),
			exportedPlaylists: z.number(),
			avgTracksPerPlaylist: z.number(),
		})
		.nullable(),
	processingStatus: z.object({
		total: z.number(),
		withLyrics: z.number(),
		classified: z.number(),
		embedded: z.number(),
	}),
	isSystemConnected: z.boolean(),
	isPipelineStable: z.boolean(),
	hasClassifyRun: z.boolean(),
	hasGenerateRun: z.boolean(),
});

export type InsightsSummary = z.infer<typeof insightsSummarySchema>;
