import {
	boolean,
	integer,
	jsonb,
	pgTable,
	primaryKey,
	real,
	serial,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

import { genreDomain } from "./genre-domain";
import { cluster } from "./cluster";
import { track } from "./track";
import { user } from "./auth";

export const character = pgTable("character", {
	id: serial("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	description: text("description"),
	genreDomainId: integer("genre_domain_id").references(() => genreDomain.id),
	energyCurve: jsonb("energy_curve").$type<number[]>(), // e.g. [0.4, 0.7, 0.5]
	isGenerated: boolean("is_generated").default(false).notNull(),
	spotifyPlaylistId: text("spotify_playlist_id"), // After export
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});

export const characterClusters = pgTable(
	"character_clusters",
	{
		characterId: integer("character_id")
			.notNull()
			.references(() => character.id, { onDelete: "cascade" }),
		clusterId: integer("cluster_id")
			.notNull()
			.references(() => cluster.id, { onDelete: "cascade" }),
		position: integer("position"),
		weight: real("weight"), // Optional: blend multiple clusters
	},
	(table) => [primaryKey({ columns: [table.characterId, table.clusterId] })],
);

export const characterTracks = pgTable(
	"character_tracks",
	{
		characterId: integer("character_id")
			.notNull()
			.references(() => character.id, { onDelete: "cascade" }),
		trackId: text("track_id")
			.notNull()
			.references(() => track.id, { onDelete: "cascade" }),
		position: integer("position").notNull(),
	},
	(table) => [primaryKey({ columns: [table.characterId, table.trackId] })],
);
