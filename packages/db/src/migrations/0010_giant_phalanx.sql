CREATE TABLE "user_tracks" (
	"user_id" text NOT NULL,
	"track_id" text NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_tracks_user_id_track_id_pk" PRIMARY KEY("user_id","track_id")
);
--> statement-breakpoint
ALTER TABLE "track" DROP CONSTRAINT "track_user_id_user_id_fk";
--> statement-breakpoint
DROP INDEX "track_user_id_idx";--> statement-breakpoint
ALTER TABLE "user_tracks" ADD CONSTRAINT "user_tracks_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tracks" ADD CONSTRAINT "user_tracks_track_id_track_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."track"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_tracks_user_id_idx" ON "user_tracks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_tracks_track_id_idx" ON "user_tracks" USING btree ("track_id");--> statement-breakpoint
ALTER TABLE "track" DROP COLUMN "user_id";