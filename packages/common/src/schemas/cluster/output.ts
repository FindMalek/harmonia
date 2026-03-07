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
