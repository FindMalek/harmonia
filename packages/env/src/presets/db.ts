import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

/**
 * DB package environment preset
 */
export const dbEnv = createEnv({
	server: {
		DATABASE_URL: z.url(),
	},
	client: {},
	clientPrefix: "NEXT_PUBLIC_",
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
	skipValidation:
		process.env.SKIP_ENV_VALIDATION === "true" ||
		process.env.NODE_ENV === "test",
});
