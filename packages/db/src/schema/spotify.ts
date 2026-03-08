import {
	integer,
	pgTable,
	primaryKey,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

export const userPlaylistSnapshots = pgTable(
	"user_playlist_snapshots",
	{
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		playlistId: text("playlist_id").notNull(),
		snapshotId: text("snapshot_id").notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [primaryKey({ columns: [table.userId, table.playlistId] })],
);

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
