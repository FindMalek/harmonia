CREATE TABLE "artist" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"image_url" text,
	"fetched_at" timestamp DEFAULT now() NOT NULL
);
