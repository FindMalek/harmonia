import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const artist = pgTable("artist", {
	id: text("id").primaryKey(), // Spotify artist ID
	name: text("name").notNull(),
	imageUrl: text("image_url"),
	fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
});
