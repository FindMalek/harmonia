import { z } from "zod";

export const classificationResultSchema = z.object({
	trackId: z.string(),
	mood: z.string().nullable(),
	secondaryMoods: z.array(z.string()),
	themes: z.array(z.string()),
	topics: z.array(z.string()),
	vibe: z.array(z.string()),
	vocalType: z.string().nullable(),
	energyLevel: z.string().nullable(),
	language: z.string().nullable(),
	era: z.string().nullable(),
	domainName: z.string().nullable(),
});
export type ClassificationResult = z.infer<typeof classificationResultSchema>;

export const classificationResultListSchema = z.object({
	results: z.array(classificationResultSchema),
});
export type ClassificationResultList = z.infer<
	typeof classificationResultListSchema
>;
