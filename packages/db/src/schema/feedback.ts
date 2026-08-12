import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth";

export const feedback = pgTable("feedback", {
	id: serial("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	message: text("message").notNull(),
	rating: integer("rating"),
	source: text("source").$type<"email_feedback_3day" | "in_app">().notNull(),
	// Correlates back to the triggering email campaign, if any.
	campaignKey: text("campaign_key"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});
