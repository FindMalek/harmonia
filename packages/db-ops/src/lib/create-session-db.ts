import type { db as DbSingleton } from "@harmonia/db";
import { dbEnv } from "@harmonia/env/presets/db";
import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { drizzle as neonDrizzle } from "drizzle-orm/neon-serverless";
import { drizzle as pgDrizzle } from "drizzle-orm/node-postgres";
import { Pool as PgPool } from "pg";
import ws from "ws";

type SessionDb = typeof DbSingleton;

export type SessionDbHandle = {
	db: SessionDb;
	release: () => Promise<void>;
};

/**
 * One checked-out connection for the full migrate run so pg_advisory_lock
 * and ledger/migration queries share the same backend session.
 */
export async function createSessionDb(): Promise<SessionDbHandle> {
	const connectionString = dbEnv.HARMONIA_DATABASE_URL;

	if (connectionString.includes(".neon.tech")) {
		neonConfig.webSocketConstructor = ws;
		const pool = new NeonPool({ connectionString, max: 1 });
		const client = await pool.connect();
		const db = neonDrizzle({ client }) as unknown as SessionDb;
		return {
			db,
			release: async () => {
				client.release();
				await pool.end();
			},
		};
	}

	const pool = new PgPool({ connectionString, max: 1 });
	const client = await pool.connect();
	const db = pgDrizzle({ client }) as unknown as SessionDb;
	return {
		db,
		release: async () => {
			client.release();
			await pool.end();
		},
	};
}
