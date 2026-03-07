import { z } from "zod";
import { taxonomyEnum } from "./enum";

export const playlistMetadataSchema = z.object({
	name: z.string(),
	description: z.string(),
	taxonomy: taxonomyEnum,
	coverColor: z.string(),
});
export type PlaylistMetadata = z.infer<typeof playlistMetadataSchema>;
