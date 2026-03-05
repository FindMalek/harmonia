import { relations } from "drizzle-orm";
import { boolean, pgTable, serial, text } from "drizzle-orm/pg-core";

import { user } from "./auth";

export const todo = pgTable("todo", {
	id: serial("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	text: text("text").notNull(),
	completed: boolean("completed").default(false).notNull(),
});

export const todoRelations = relations(todo, ({ one }) => ({
	user: one(user),
}));
