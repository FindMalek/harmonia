CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "character" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"genre_domain_id" integer,
	"energy_curve" jsonb,
	"is_generated" boolean DEFAULT false NOT NULL,
	"spotify_playlist_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "character_clusters" (
	"character_id" integer NOT NULL,
	"cluster_id" integer NOT NULL,
	"position" integer,
	"weight" real,
	CONSTRAINT "character_clusters_character_id_cluster_id_pk" PRIMARY KEY("character_id","cluster_id")
);
--> statement-breakpoint
CREATE TABLE "character_tracks" (
	"character_id" integer NOT NULL,
	"track_id" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "character_tracks_character_id_track_id_pk" PRIMARY KEY("character_id","track_id")
);
--> statement-breakpoint
CREATE TABLE "cluster" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"genre_domain_id" integer NOT NULL,
	"centroid" jsonb,
	"size" integer NOT NULL,
	"avg_valence" real,
	"avg_energy" real,
	"avg_tempo" real,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cluster_tracks" (
	"cluster_id" integer NOT NULL,
	"track_id" text NOT NULL,
	"position" integer,
	CONSTRAINT "cluster_tracks_cluster_id_track_id_pk" PRIMARY KEY("cluster_id","track_id")
);
--> statement-breakpoint
CREATE TABLE "genre_domain" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	CONSTRAINT "genre_domain_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "todo" (
	"id" serial PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"completed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "track" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"spotify_uri" text NOT NULL,
	"name" text NOT NULL,
	"artist_names" text NOT NULL,
	"album_name" text,
	"duration_ms" integer,
	"spotify_genres" jsonb,
	"genre_domain_id" integer,
	"valence" real,
	"energy" real,
	"danceability" real,
	"tempo" real,
	"acousticness" real,
	"instrumentalness" real,
	"speechiness" real,
	"liveness" real,
	"key" integer,
	"mode" integer,
	"lyrics" text,
	"synced_lyrics" text,
	"lyrics_instrumental" boolean,
	"lrclib_id" integer,
	"lyrics_fetched_at" timestamp,
	"lyrics_status" text,
	"llm_mood" text,
	"llm_tags" jsonb,
	"llm_classified_at" timestamp,
	"embedding" vector(1536),
	"embedding_generated_at" timestamp,
	"embedding_input" text,
	"domain_assigned_at" timestamp,
	"analysis_snapshot" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character" ADD CONSTRAINT "character_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character" ADD CONSTRAINT "character_genre_domain_id_genre_domain_id_fk" FOREIGN KEY ("genre_domain_id") REFERENCES "public"."genre_domain"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_clusters" ADD CONSTRAINT "character_clusters_character_id_character_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."character"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_clusters" ADD CONSTRAINT "character_clusters_cluster_id_cluster_id_fk" FOREIGN KEY ("cluster_id") REFERENCES "public"."cluster"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_tracks" ADD CONSTRAINT "character_tracks_character_id_character_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."character"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_tracks" ADD CONSTRAINT "character_tracks_track_id_track_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."track"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cluster" ADD CONSTRAINT "cluster_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cluster" ADD CONSTRAINT "cluster_genre_domain_id_genre_domain_id_fk" FOREIGN KEY ("genre_domain_id") REFERENCES "public"."genre_domain"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cluster_tracks" ADD CONSTRAINT "cluster_tracks_cluster_id_cluster_id_fk" FOREIGN KEY ("cluster_id") REFERENCES "public"."cluster"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cluster_tracks" ADD CONSTRAINT "cluster_tracks_track_id_track_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."track"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track" ADD CONSTRAINT "track_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track" ADD CONSTRAINT "track_genre_domain_id_genre_domain_id_fk" FOREIGN KEY ("genre_domain_id") REFERENCES "public"."genre_domain"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "track_user_id_idx" ON "track" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "track_genre_domain_id_idx" ON "track" USING btree ("genre_domain_id");--> statement-breakpoint
CREATE INDEX "track_lyrics_status_idx" ON "track" USING btree ("lyrics_status");--> statement-breakpoint
CREATE INDEX "track_embedding_idx" ON "track" USING hnsw ("embedding" vector_cosine_ops);
--> statement-breakpoint
-- Seed initial genre domains
INSERT INTO "genre_domain" ("name", "description") VALUES
  ('Electronic', 'Electronic and dance-oriented music'),
  ('Hip-Hop', 'Hip-hop, rap, and related subgenres'),
  ('Rock', 'Rock and alternative rock'),
  ('Classical', 'Classical, orchestral, and chamber music'),
  ('Jazz', 'Jazz and related improvisational styles'),
  ('Indie/Alt', 'Indie and alternative styles across genres'),
  ('Pop', 'Mainstream and indie pop'),
  ('World', 'Global and regional traditional styles'),
  ('Ambient', 'Ambient, drone, and background textures'),
  ('Soundtrack', 'Film, game, and TV soundtracks');