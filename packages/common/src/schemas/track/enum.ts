import { z } from "zod";

// TODO : move to db schema and import from there
export const lyricsStatusEnum = z.enum([
	"pending",
	"found",
	"not_found",
	"error",
]);
export type LyricsStatus = z.infer<typeof lyricsStatusEnum>;
