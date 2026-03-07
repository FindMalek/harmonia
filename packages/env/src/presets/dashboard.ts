import { z } from "zod";
import { createEnv } from "@t3-oss/env-nextjs";
import { clientModule, observabilityModule, urlsModule } from "../modules";
import { createNextjsRuntimeEnv } from "../utils/runtime-env";
import { dbEnv } from "./db";

/**
 * Dashboard app environment preset
 * Only includes SPOTIFY_CLIENT_ID for login page (optional)
 */
export const dashboardEnv = createEnv({
	extends: [dbEnv],
	server: {
		SPOTIFY_CLIENT_ID: z.string().min(1).optional(),
		...observabilityModule.server,
	},
	client: {
		...clientModule.client,
		...urlsModule.client,
	},
	runtimeEnv: createNextjsRuntimeEnv(),
	emptyStringAsUndefined: true,
	skipValidation:
		process.env.SKIP_ENV_VALIDATION === "true" ||
		process.env.NODE_ENV === "test",
});
