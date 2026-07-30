-- Clean up any pre-existing concurrent "running" rows before enforcing the
-- index below — the race this migration fixes could already have left
-- duplicates in place, which would make the CREATE UNIQUE INDEX fail.
-- Keep only the most recently started "running" row per user; mark the rest
-- failed rather than deleting them, so run history stays intact.
UPDATE "pipeline_run"
SET "status" = 'failed',
    "error" = 'Superseded by a concurrent run for the same user (cleaned up when adding pipeline_run_one_running_per_user)',
    "completed_at" = now()
WHERE "status" = 'running'
  AND "id" NOT IN (
    SELECT DISTINCT ON ("user_id") "id"
    FROM "pipeline_run"
    WHERE "status" = 'running'
    ORDER BY "user_id", "started_at" DESC NULLS LAST, "id" DESC
  );
--> statement-breakpoint
CREATE UNIQUE INDEX "pipeline_run_one_running_per_user" ON "pipeline_run" USING btree ("user_id") WHERE "pipeline_run"."status" = 'running';