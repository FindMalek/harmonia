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
