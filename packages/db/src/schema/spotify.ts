import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth";

export const userSpotifyLibraryStats = pgTable("user_spotify_library_stats", {
	userId: text("user_id")
		.primaryKey()
		.references(() => user.id, { onDelete: "cascade" }),
	totalTracks: integer("total_tracks").notNull().default(0),
	totalPlaylists: integer("total_playlists").notNull().default(0),
	uniqueAlbums: integer("unique_albums").notNull().default(0),
	uniqueArtists: integer("unique_artists").notNull().default(0),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
});
