CREATE TABLE "external_api_call" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text,
	"pipeline_run_id" integer,
	"provider" text NOT NULL,
	"endpoint" text NOT NULL,
	"method" text DEFAULT 'GET' NOT NULL,
	"request_payload" jsonb,
	"http_status" integer,
	"response_payload" jsonb,
	"duration_ms" integer,
	"error_message" text,
	"status_category" text NOT NULL,
	"retry_attempt" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "external_api_call" ADD CONSTRAINT "external_api_call_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_api_call" ADD CONSTRAINT "external_api_call_pipeline_run_id_pipeline_run_id_fk" FOREIGN KEY ("pipeline_run_id") REFERENCES "public"."pipeline_run"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "eac_user_id_idx" ON "external_api_call" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "eac_pipeline_run_id_idx" ON "external_api_call" USING btree ("pipeline_run_id");--> statement-breakpoint
CREATE INDEX "eac_provider_idx" ON "external_api_call" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "eac_status_category_idx" ON "external_api_call" USING btree ("status_category");--> statement-breakpoint
CREATE INDEX "eac_created_at_idx" ON "external_api_call" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "eac_provider_created_at_idx" ON "external_api_call" USING btree ("provider","created_at");--> statement-breakpoint
CREATE INDEX "eac_user_status_idx" ON "external_api_call" USING btree ("user_id","status_category");