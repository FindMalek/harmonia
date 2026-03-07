import { z } from "zod";

export const playlistGetByIdInput = z.object({
	id: z.number(),
});
export type PlaylistGetByIdInput = z.infer<typeof playlistGetByIdInput>;

export const playlistUpdateInput = z.object({
	id: z.number(),
	name: z.string().optional(),
	description: z.string().optional(),
});
export type PlaylistUpdateInput = z.infer<typeof playlistUpdateInput>;

export const playlistExportInput = z.object({
	id: z.number(),
});
export type PlaylistExportInput = z.infer<typeof playlistExportInput>;
