CREATE TABLE "track_analysis" (
	"id" serial PRIMARY KEY NOT NULL,
	"track_id" text NOT NULL,
	"mood" text,
	"secondary_moods" jsonb,
	"themes" jsonb,
	"topics" jsonb,
	"vibe" jsonb,
	"vocal_type" text,
	"energy_level" text,
	"language" text,
	"era" text,
	"model_id" text NOT NULL,
	"classified_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "track_analysis" ADD CONSTRAINT "track_analysis_track_id_track_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."track"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "track_analysis_track_id_idx" ON "track_analysis" USING btree ("track_id");--> statement-breakpoint
CREATE INDEX "track_analysis_classified_at_idx" ON "track_analysis" USING btree ("classified_at");--> statement-breakpoint
-- Backfill: one row per already-classified track. model_id falls back to the
-- one LLM this app has ever used (openai/gpt-oss-20b) for older rows written
-- before analysis_snapshot.modelVersions.llm existed.
INSERT INTO "track_analysis" ("track_id", "mood", "secondary_moods", "themes", "topics", "vibe", "vocal_type", "energy_level", "language", "era", "model_id", "classified_at")
SELECT
	"id",
	"llm_mood",
	"llm_tags"->'secondaryMoods',
	"llm_tags"->'themes',
	"llm_tags"->'topics',
	"llm_tags"->'vibe',
	"llm_tags"->>'vocalType',
	"llm_tags"->>'energyLevel',
	"llm_tags"->>'language',
	"llm_tags"->>'era',
	COALESCE("analysis_snapshot"->'modelVersions'->>'llm', 'openai/gpt-oss-20b'),
	"llm_classified_at"
FROM "track"
WHERE "llm_classified_at" IS NOT NULL;