import { z } from "zod";

// TODO : move to db schema and import from there
export const suggestedArchetypeEnum = z.enum([
	"mood",
	"situation",
	"genre",
	"hybrid",
]);
export type SuggestedArchetype = z.infer<typeof suggestedArchetypeEnum>;
