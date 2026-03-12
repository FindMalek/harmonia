CREATE TABLE "user_playlist_snapshots" (
	"user_id" text NOT NULL,
	"playlist_id" text NOT NULL,
	"snapshot_id" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_playlist_snapshots_user_id_playlist_id_pk" PRIMARY KEY("user_id","playlist_id")
);
--> statement-breakpoint
ALTER TABLE "user_playlist_snapshots" ADD CONSTRAINT "user_playlist_snapshots_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;