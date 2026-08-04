import { env } from "@harmonia/env/server";
import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { type Column, eq, type SQL, sql } from "drizzle-orm";
import { drizzle as neonDrizzle } from "drizzle-orm/neon-serverless";
import { drizzle as pgDrizzle } from "drizzle-orm/node-postgres";
import { Pool as PgPool } from "pg";
import ws from "ws";

import * as schema from "./schema";

export { eq };

export type DatabaseEnv = {
	HARMONIA_DATABASE_URL: string;
};

const connectionString = env.HARMONIA_DATABASE_URL;

function createDb() {
	if (connectionString.includes(".neon.tech")) {
		neonConfig.webSocketConstructor = ws;
		return neonDrizzle({ client: new NeonPool({ connectionString }), schema });
	}
	return pgDrizzle({ client: new PgPool({ connectionString }), schema });
}

export const db = createDb();

// Use in onConflictDoUpdate set blocks instead of inline sql`excluded.<col>` snippets.
export function conflictValue<T>(col: Column): SQL<T> {
	return sql<T>`excluded.${sql.identifier(col.name)}`;
}

// Like conflictValue, but keeps the existing stored value when the new row's
// value is null — for fields that can legitimately be absent from a narrower
// data source (e.g. a cached Spotify playlist-items response fetched before a
// field was added to the request) without that meaning the value should be
// erased from an already-populated row.
export function conflictValuePreserveExisting<T>(col: Column): SQL<T> {
	return sql<T>`coalesce(excluded.${sql.identifier(col.name)}, ${col})`;
}
