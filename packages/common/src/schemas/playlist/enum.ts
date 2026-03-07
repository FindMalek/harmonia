import { z } from "zod";

// TODO : move to db schema and import from there
export const taxonomyEnum = z.enum(["mood", "situation", "genre", "hybrid"]);
export type Taxonomy = z.infer<typeof taxonomyEnum>;
