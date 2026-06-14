CREATE TABLE "email_send_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text,
	"email" text NOT NULL,
	"template_key" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"skip_reason" text,
	"provider_message_id" text,
	"error" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"sent_at" timestamp,
	CONSTRAINT "email_send_log_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "email_suppression" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"reason" text NOT NULL,
	"source" text,
	"metadata" jsonb,
	"suppressed_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "email_suppression_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "user_email_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"transactional_enabled" boolean DEFAULT true NOT NULL,
	"product_updates_enabled" boolean DEFAULT false NOT NULL,
	"marketing_enabled" boolean DEFAULT false NOT NULL,
	"feedback_enabled" boolean DEFAULT false NOT NULL,
	"consent_source" text,
	"consent_captured_at" timestamp,
	"unsubscribed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_send_log" ADD CONSTRAINT "email_send_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_email_preferences" ADD CONSTRAINT "user_email_preferences_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_send_log_user_id_idx" ON "email_send_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "email_send_log_status_idx" ON "email_send_log" USING btree ("status");--> statement-breakpoint
CREATE INDEX "email_send_log_template_key_idx" ON "email_send_log" USING btree ("template_key");--> statement-breakpoint
CREATE INDEX "email_send_log_created_at_idx" ON "email_send_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "email_suppression_suppressed_at_idx" ON "email_suppression" USING btree ("suppressed_at");