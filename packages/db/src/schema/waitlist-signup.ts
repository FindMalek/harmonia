import {
	index,
	pgEnum,
	pgTable,
	serial,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

export const waitlistStatusEnum = pgEnum("waitlist_status", [
	"pending",
	"approved",
	"rejected",
]);

export const waitlistSignup = pgTable(
	"waitlist_signup",
	{
		id: serial("id").primaryKey(),
		email: text("email").notNull().unique(),
		status: waitlistStatusEnum("status").notNull().default("pending"),
		note: text("note"),
		confirmationEmailSentAt: timestamp("confirmation_email_sent_at"),
		approvedAt: timestamp("approved_at"),
		approvalEmailSentAt: timestamp("approval_email_sent_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("waitlist_signup_status_idx").on(table.status),
		index("waitlist_signup_created_at_idx").on(table.createdAt),
	],
);
