ALTER TABLE "user_email_preferences" ALTER COLUMN "product_updates_enabled" SET DEFAULT true;--> statement-breakpoint
ALTER TABLE "user_email_preferences" ALTER COLUMN "marketing_enabled" SET DEFAULT true;--> statement-breakpoint
ALTER TABLE "user_email_preferences" ALTER COLUMN "feedback_enabled" SET DEFAULT true;--> statement-breakpoint
UPDATE "user_email_preferences" SET "product_updates_enabled" = true, "feedback_enabled" = true;--> statement-breakpoint
UPDATE "user_email_preferences" SET "marketing_enabled" = true WHERE "unsubscribed_at" IS NULL;
