import { z } from "zod";
import { taxonomyEnum } from "./enum";

export const playlistMetadataSchema = z.object({
	name: z.string(),
	description: z.string(),
	taxonomy: taxonomyEnum,
	coverColor: z.string(),
});
export type PlaylistMetadata = z.infer<typeof playlistMetadataSchema>;

export const playlistListItemSchema = z.object({
	id: z.number(),
	userId: z.string(),
	name: z.string(),
	aiGeneratedName: z.string().nullable(),
	description: z.string().nullable(),
	theme: z.string().nullable(),
	taxonomy: z.string().nullable(),
	genreDomainId: z.number().nullable(),
	energyCurve: z.array(z.number()).nullable(),
	coverColor: z.string().nullable(),
	trackCount: z.number(),
	isGenerated: z.boolean(),
	spotifyPlaylistId: z.string().nullable(),
	exportedAt: z.date().nullable(),
	createdAt: z.date(),
	updatedAt: z.date(),
});
export type PlaylistListItem = z.infer<typeof playlistListItemSchema>;

const playlistTrackItemSchema = z.object({
	id: z.string(),
	name: z.string(),
	artistNames: z.string(),
	albumName: z.string().nullable(),
	durationMs: z.number().nullable(),
	llmMood: z.string().nullable(),
	llmTags: z.record(z.string(), z.unknown()).nullable(),
	position: z.number(),
});

export const playlistGetByIdOutputSchema = playlistListItemSchema.extend({
	tracks: z.array(playlistTrackItemSchema),
});
export type PlaylistGetByIdOutput = z.infer<typeof playlistGetByIdOutputSchema>;

export const playlistUpdateOutputSchema = playlistListItemSchema;
export type PlaylistUpdateOutput = z.infer<typeof playlistUpdateOutputSchema>;

export const playlistExportOutputSchema = z.object({
	spotifyPlaylistId: z.string(),
	spotifyUrl: z.string(),
});
export type PlaylistExportOutput = z.infer<typeof playlistExportOutputSchema>;

export const playlistExportAllOutputSchema = z.object({
	exported: z.number(),
	failed: z.number(),
});
export type PlaylistExportAllOutput = z.infer<
	typeof playlistExportAllOutputSchema
>;
