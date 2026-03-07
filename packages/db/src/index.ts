import { env } from "@harmonia/env/server";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

export type DatabaseEnv = {
	DATABASE_URL: string;
};

const sql = neon(env.DATABASE_URL);
export const db = drizzle(sql, { schema });
