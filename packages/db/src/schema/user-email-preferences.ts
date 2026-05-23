import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth";

export const userEmailPreferences = pgTable("user_email_preferences", {
	userId: text("user_id")
		.primaryKey()
		.references(() => user.id, { onDelete: "cascade" }),
	transactionalEnabled: boolean("transactional_enabled")
		.notNull()
		.default(true),
	productUpdatesEnabled: boolean("product_updates_enabled")
		.notNull()
		.default(false),
	marketingEnabled: boolean("marketing_enabled").notNull().default(false),
	feedbackEnabled: boolean("feedback_enabled").notNull().default(false),
	consentSource: text("consent_source"),
	consentCapturedAt: timestamp("consent_captured_at"),
	unsubscribedAt: timestamp("unsubscribed_at"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
});
