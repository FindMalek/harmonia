CREATE TABLE "user_playlist_snapshot_item_artists" (
	"user_id" text NOT NULL,
	"playlist_id" text NOT NULL,
	"position" integer NOT NULL,
	"artist_position" integer NOT NULL,
	"artist_id" text,
	"artist_name" text NOT NULL,
	CONSTRAINT "user_playlist_snapshot_item_artists_user_id_playlist_id_position_artist_position_pk" PRIMARY KEY("user_id","playlist_id","position","artist_position")
);
--> statement-breakpoint
CREATE TABLE "user_playlist_snapshot_items" (
	"user_id" text NOT NULL,
	"playlist_id" text NOT NULL,
	"snapshot_id" text NOT NULL,
	"position" integer NOT NULL,
	"track_id" text NOT NULL,
	"track_name" text NOT NULL,
	"track_uri" text NOT NULL,
	"album_id" text,
	"album_name" text,
	"duration_ms" integer,
	CONSTRAINT "user_playlist_snapshot_items_user_id_playlist_id_position_pk" PRIMARY KEY("user_id","playlist_id","position")
);
--> statement-breakpoint
ALTER TABLE "user_playlist_snapshot_item_artists" ADD CONSTRAINT "user_playlist_snapshot_item_artists_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_playlist_snapshot_items" ADD CONSTRAINT "user_playlist_snapshot_items_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;