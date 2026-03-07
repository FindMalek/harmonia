import { z } from "zod";

export const spotifyTrackSchema = z.object({
	id: z.string(),
	uri: z.string(),
	name: z.string(),
	artists: z.array(z.object({ name: z.string() })),
	album: z.object({
		name: z.string(),
	}),
	duration_ms: z.number(),
});
export type SpotifyTrack = z.infer<typeof spotifyTrackSchema>;

export const spotifySavedTrackItemSchema = z.object({
	added_at: z.string(),
	track: spotifyTrackSchema,
});
export type SpotifySavedTrackItem = z.infer<typeof spotifySavedTrackItemSchema>;

export const spotifySavedTracksResponseSchema = z.object({
	items: z.array(spotifySavedTrackItemSchema),
	next: z.string().nullable(),
});
export type SpotifySavedTracksResponse = z.infer<
	typeof spotifySavedTracksResponseSchema
>;

export const spotifyAudioFeaturesSchema = z.object({
	id: z.string(),
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
});
export type SpotifyAudioFeatures = z.infer<typeof spotifyAudioFeaturesSchema>;

export const spotifyAudioFeaturesResponseSchema = z.object({
	audio_features: z.array(spotifyAudioFeaturesSchema),
});
export type SpotifyAudioFeaturesResponse = z.infer<
	typeof spotifyAudioFeaturesResponseSchema
>;
