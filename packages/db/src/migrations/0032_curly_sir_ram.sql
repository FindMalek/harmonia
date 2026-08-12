CREATE TABLE "pipeline_stage_timing" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" integer NOT NULL,
	"stage" text NOT NULL,
	"track_count" integer,
	"started_at" timestamp NOT NULL,
	"completed_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pipeline_stage_timing" ADD CONSTRAINT "pipeline_stage_timing_run_id_pipeline_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."pipeline_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pipeline_stage_timing_stage_idx" ON "pipeline_stage_timing" USING btree ("stage");