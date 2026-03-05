-- Add user_id to todo table for user-scoped todos
ALTER TABLE "todo" ADD COLUMN "user_id" text;--> statement-breakpoint
UPDATE "todo" SET "user_id" = (SELECT "id" FROM "user" LIMIT 1) WHERE "user_id" IS NULL;--> statement-breakpoint
DELETE FROM "todo" WHERE "user_id" IS NULL;--> statement-breakpoint
ALTER TABLE "todo" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "todo" ADD CONSTRAINT "todo_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
