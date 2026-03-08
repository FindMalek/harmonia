CREATE TABLE "user_spotify_library_stats" (
	"user_id" text PRIMARY KEY NOT NULL,
	"total_tracks" integer DEFAULT 0 NOT NULL,
	"total_playlists" integer DEFAULT 0 NOT NULL,
	"unique_albums" integer DEFAULT 0 NOT NULL,
	"unique_artists" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_spotify_library_stats" ADD CONSTRAINT "user_spotify_library_stats_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;