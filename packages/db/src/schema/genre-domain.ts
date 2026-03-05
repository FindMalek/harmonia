import { pgTable, serial, text } from "drizzle-orm/pg-core";

export const genreDomain = pgTable("genre_domain", {
	id: serial("id").primaryKey(),
	name: text("name").notNull().unique(),
	description: text("description"),
});
