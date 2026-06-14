import {
	index,
	jsonb,
	pgTable,
	serial,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

export const emailSendLog = pgTable(
	"email_send_log",
	{
		id: serial("id").primaryKey(),
		userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
		email: text("email").notNull(),
		templateKey: text("template_key").notNull(),
		idempotencyKey: text("idempotency_key").notNull().unique(),
		status: text("status").notNull().default("queued"),
		skipReason: text("skip_reason"),
		providerMessageId: text("provider_message_id"),
		error: text("error"),
		metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		sentAt: timestamp("sent_at"),
	},
	(table) => [
		index("email_send_log_user_id_idx").on(table.userId),
		index("email_send_log_status_idx").on(table.status),
		index("email_send_log_template_key_idx").on(table.templateKey),
		index("email_send_log_created_at_idx").on(table.createdAt),
		index("email_send_log_provider_message_id_idx").on(table.providerMessageId),
	],
);
