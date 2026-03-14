import { env } from "@harmonia/env/server";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

import * as schema from "./schema";

export type DatabaseEnv = {
	HARMONIA_DATABASE_URL: string;
};

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: env.HARMONIA_DATABASE_URL });
export const db = drizzle({ client: pool, schema });
