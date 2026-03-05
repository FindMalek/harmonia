import {
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
import { track } from "./track";
import { user } from "./auth";

export const cluster = pgTable("cluster", {
	id: serial("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	genreDomainId: integer("genre_domain_id")
		.notNull()
		.references(() => genreDomain.id),
	centroid: jsonb("centroid").$type<number[]>(), // Or vector if preferred
	size: integer("size").notNull(),
	avgValence: real("avg_valence"),
	avgEnergy: real("avg_energy"),
	avgTempo: real("avg_tempo"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const clusterTracks = pgTable(
	"cluster_tracks",
	{
		clusterId: integer("cluster_id")
			.notNull()
			.references(() => cluster.id, { onDelete: "cascade" }),
		trackId: text("track_id")
			.notNull()
			.references(() => track.id, { onDelete: "cascade" }),
		position: integer("position"),
	},
	(table) => [primaryKey({ columns: [table.clusterId, table.trackId] })],
);
