import { z } from "zod";

export const playlistMetadataSchema = z.object({
	name: z.string(),
	description: z.string(),
	taxonomy: z.enum(["mood", "situation", "genre", "hybrid"]),
	coverColor: z.string(),
});

export type PlaylistMetadata = z.infer<typeof playlistMetadataSchema>;
