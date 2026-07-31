import { z } from "zod";

export const playlistGetByIdInput = z.object({
	id: z.number(),
});
export type PlaylistGetByIdInput = z.infer<typeof playlistGetByIdInput>;

export const playlistListInput = z.object({
	cursor: z.number().nullish(),
	limit: z.number().int().min(1).max(50).default(20),
	search: z.string().optional(),
});
export type PlaylistListInput = z.infer<typeof playlistListInput>;

export const playlistUpdateInput = z.object({
	id: z.number(),
	name: z.string().optional(),
	description: z.string().optional(),
	autoSyncEnabled: z.boolean().optional(),
});
export type PlaylistUpdateInput = z.infer<typeof playlistUpdateInput>;

export const playlistExportInput = z.object({
	id: z.number(),
});
export type PlaylistExportInput = z.infer<typeof playlistExportInput>;
