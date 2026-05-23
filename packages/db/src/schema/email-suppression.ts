import {
	index,
	jsonb,
	pgTable,
	serial,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

export const emailSuppression = pgTable(
	"email_suppression",
	{
		id: serial("id").primaryKey(),
		email: text("email").notNull().unique(),
		reason: text("reason").notNull(),
		source: text("source"),
		metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
		suppressedAt: timestamp("suppressed_at").defaultNow().notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("email_suppression_suppressed_at_idx").on(table.suppressedAt),
	],
);
