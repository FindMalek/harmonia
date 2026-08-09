import {
	index,
	jsonb,
	pgTable,
	serial,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

import { track } from "./track";

export const trackAnalysis = pgTable(
	"track_analysis",
	{
		id: serial("id").primaryKey(),
		trackId: text("track_id")
			.notNull()
			.references(() => track.id, { onDelete: "cascade" }),

		// Classification output (was track.llmMood / track.llmTags)
		mood: text("mood"),
		secondaryMoods: jsonb("secondary_moods").$type<string[]>(),
		themes: jsonb("themes").$type<string[]>(),
		topics: jsonb("topics").$type<string[]>(),
		vibe: jsonb("vibe").$type<string[]>(),
		vocalType: text("vocal_type"),
		energyLevel: text("energy_level"),
		language: text("language"),
		era: text("era"),

		// Provenance — e.g. "openai/gpt-oss-20b"
		modelId: text("model_id").notNull(),
		classifiedAt: timestamp("classified_at").defaultNow().notNull(),
	},
	(table) => [
		index("track_analysis_track_id_idx").on(table.trackId),
		index("track_analysis_classified_at_idx").on(table.classifiedAt),
	],
);
