import { env } from "@harmonia/env/server";
import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { drizzle as neonDrizzle } from "drizzle-orm/neon-serverless";
import { drizzle as pgDrizzle } from "drizzle-orm/node-postgres";
import { Pool as PgPool } from "pg";
import ws from "ws";

import * as schema from "./schema";

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
