import { z } from "zod";
import { suggestedArchetypeEnum } from "./enum";

export const clusterMetadataSchema = z.object({
	themeSummary: z.string(),
	dominantMood: z.string(),
	dominantEnergy: z.string(),
	topThemes: z.array(z.string()),
	topVibes: z.array(z.string()),
	suggestedArchetype: suggestedArchetypeEnum,
});
export type ClusterMetadata = z.infer<typeof clusterMetadataSchema>;

export const clusterListItemSchema = z.object({
	id: z.number(),
	userId: z.string(),
	genreDomainId: z.number(),
	centroid: z.array(z.number()).nullable(),
	size: z.number(),
	avgValence: z.number().nullable(),
	avgEnergy: z.number().nullable(),
	avgTempo: z.number().nullable(),
	metadata: z.record(z.string(), z.unknown()).nullable(),
	createdAt: z.date(),
});
export type ClusterListItem = z.infer<typeof clusterListItemSchema>;

const clusterTrackItemSchema = z.object({
	id: z.string(),
	name: z.string(),
	artistNames: z.string(),
	albumName: z.string().nullable(),
	llmMood: z.string().nullable(),
	llmTags: z.record(z.string(), z.unknown()).nullable(),
	position: z.number().nullable(),
});

export const clusterGetByIdOutputSchema = clusterListItemSchema.extend({
	tracks: z.array(clusterTrackItemSchema),
});
export type ClusterGetByIdOutput = z.infer<typeof clusterGetByIdOutputSchema>;
