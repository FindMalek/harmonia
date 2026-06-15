CREATE TYPE "public"."waitlist_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "waitlist_signup" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"status" "waitlist_status" DEFAULT 'pending' NOT NULL,
	"note" text,
	"confirmation_email_sent_at" timestamp,
	"approved_at" timestamp,
	"approval_email_sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "waitlist_signup_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX "waitlist_signup_status_idx" ON "waitlist_signup" USING btree ("status");--> statement-breakpoint
CREATE INDEX "waitlist_signup_created_at_idx" ON "waitlist_signup" USING btree ("created_at");