CREATE TABLE "playlist" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"ai_generated_name" text,
	"description" text,
	"theme" text,
	"taxonomy" text,
	"genre_domain_id" integer,
	"energy_curve" jsonb,
	"cover_color" text,
	"track_count" integer DEFAULT 0 NOT NULL,
	"is_generated" boolean DEFAULT false NOT NULL,
	"spotify_playlist_id" text,
	"exported_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "playlist_clusters" (
	"playlist_id" integer NOT NULL,
	"cluster_id" integer NOT NULL,
	"position" integer,
	"weight" real,
	CONSTRAINT "playlist_clusters_playlist_id_cluster_id_pk" PRIMARY KEY("playlist_id","cluster_id")
);
--> statement-breakpoint
CREATE TABLE "playlist_tracks" (
	"playlist_id" integer NOT NULL,
	"track_id" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "playlist_tracks_playlist_id_track_id_pk" PRIMARY KEY("playlist_id","track_id")
);
--> statement-breakpoint
ALTER TABLE "cluster" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "playlist" ADD CONSTRAINT "playlist_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playlist" ADD CONSTRAINT "playlist_genre_domain_id_genre_domain_id_fk" FOREIGN KEY ("genre_domain_id") REFERENCES "public"."genre_domain"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playlist_clusters" ADD CONSTRAINT "playlist_clusters_playlist_id_playlist_id_fk" FOREIGN KEY ("playlist_id") REFERENCES "public"."playlist"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playlist_clusters" ADD CONSTRAINT "playlist_clusters_cluster_id_cluster_id_fk" FOREIGN KEY ("cluster_id") REFERENCES "public"."cluster"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playlist_tracks" ADD CONSTRAINT "playlist_tracks_playlist_id_playlist_id_fk" FOREIGN KEY ("playlist_id") REFERENCES "public"."playlist"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playlist_tracks" ADD CONSTRAINT "playlist_tracks_track_id_track_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."track"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "playlist_user_id_idx" ON "playlist" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "playlist_taxonomy_idx" ON "playlist" USING btree ("taxonomy");--> statement-breakpoint
CREATE INDEX "cluster_user_id_idx" ON "cluster" USING btree ("user_id");