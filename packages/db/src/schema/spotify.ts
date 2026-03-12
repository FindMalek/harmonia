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

export const userPlaylistSnapshotItems = pgTable(
	"user_playlist_snapshot_items",
	{
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		playlistId: text("playlist_id").notNull(),
		snapshotId: text("snapshot_id").notNull(),
		position: integer("position").notNull(),
		trackId: text("track_id").notNull(),
		trackName: text("track_name").notNull(),
		trackUri: text("track_uri").notNull(),
		albumId: text("album_id"),
		albumName: text("album_name"),
		durationMs: integer("duration_ms"),
	},
	(table) => [
		primaryKey({
			columns: [table.userId, table.playlistId, table.position],
		}),
	],
);

export const userPlaylistSnapshotItemArtists = pgTable(
	"user_playlist_snapshot_item_artists",
	{
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		playlistId: text("playlist_id").notNull(),
		position: integer("position").notNull(),
		artistPosition: integer("artist_position").notNull(),
		artistId: text("artist_id"),
		artistName: text("artist_name").notNull(),
	},
	(table) => [
		primaryKey({
			columns: [
				table.userId,
				table.playlistId,
				table.position,
				table.artistPosition,
			],
		}),
	],
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
