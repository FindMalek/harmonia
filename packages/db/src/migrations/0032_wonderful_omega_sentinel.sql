ALTER TABLE "track" ADD COLUMN "audio_features_fetched_at" timestamp;--> statement-breakpoint
ALTER TABLE "track" ADD COLUMN "audio_features_status" text;--> statement-breakpoint
CREATE INDEX "track_audio_features_status_idx" ON "track" USING btree ("audio_features_status");