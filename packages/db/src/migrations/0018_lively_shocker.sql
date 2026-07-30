ALTER TABLE "user" ADD COLUMN "is_approved" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "waitlist_signup" ADD COLUMN "invite_token" text;--> statement-breakpoint
ALTER TABLE "waitlist_signup" ADD COLUMN "invite_token_raw" text;--> statement-breakpoint
ALTER TABLE "waitlist_signup" ADD COLUMN "invite_token_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "waitlist_signup" ADD COLUMN "invite_redeemed_at" timestamp;--> statement-breakpoint
ALTER TABLE "waitlist_signup" ADD COLUMN "invite_redeemed_by_user_id" text;--> statement-breakpoint
CREATE INDEX "waitlist_signup_invite_token_idx" ON "waitlist_signup" USING btree ("invite_token");--> statement-breakpoint
ALTER TABLE "waitlist_signup" ADD CONSTRAINT "waitlist_signup_invite_token_unique" UNIQUE("invite_token");