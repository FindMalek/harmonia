import { z } from "zod";

export const clusterMetadataSchema = z.object({
	themeSummary: z.string(),
	dominantMood: z.string(),
	dominantEnergy: z.string(),
	topThemes: z.array(z.string()),
	topVibes: z.array(z.string()),
	suggestedArchetype: z.enum(["mood", "situation", "genre", "hybrid"]),
});

export type ClusterMetadata = z.infer<typeof clusterMetadataSchema>;
