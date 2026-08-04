ALTER TABLE "track" ADD COLUMN "artist_ids" jsonb;--> statement-breakpoint
ALTER TABLE "track" ADD COLUMN "album_id" text;--> statement-breakpoint
ALTER TABLE "track" ADD COLUMN "release_date" text;--> statement-breakpoint
ALTER TABLE "track" ADD COLUMN "explicit" boolean;--> statement-breakpoint
ALTER TABLE "track" ADD COLUMN "popularity" integer;