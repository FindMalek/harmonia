import { z } from "zod";

export const tracksListInput = z.object({
	page: z.number().default(1),
	pageSize: z.number().default(50),
	search: z.string().optional(),
	lyricsStatus: z.string().optional(),
	classified: z.boolean().optional(),
	embedded: z.boolean().optional(),
});
export type TracksListInput = z.infer<typeof tracksListInput>;

export const trackGetByIdInput = z.object({
	id: z.string(),
});
export type TrackGetByIdInput = z.infer<typeof trackGetByIdInput>;
