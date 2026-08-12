import {
	boolean,
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
	// When syncLibraryTracks last did a REAL full sync (Liked Songs + owned
	// playlists) — distinct from `updatedAt` below, which also gets bumped by
	// refreshSpotifyLibraryStats's unrelated playlists-only 24h stats cache (#284).
	// Null means never synced; always triggers a real sync (onboarding case).
	lastFullSyncAt: timestamp("last_full_sync_at"),
	// Reactive: set when a refresh attempt gets back `invalid_grant` from Spotify
	// (#289) — the connection is dead right now, not just "will expire soon".
	// Cleared on any successful refresh and whenever Better Auth writes a fresh
	// Spotify `account` row (re-auth), see packages/auth/src/index.ts.
	needsReauth: boolean("needs_reauth").notNull().default(false),
	// Proactive: which expiry-warning email has been sent for the CURRENT token
	// cycle, so each stage fires at most once. Reset to null on reconnect.
	reauthReminderStage: text("reauth_reminder_stage").$type<
		"14d" | "3d" | "0d" | null
	>(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
});
