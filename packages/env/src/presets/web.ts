import { createEnv } from "@t3-oss/env-nextjs";
import { clientModule, observabilityModule, urlsModule } from "../modules";
import { createNextjsRuntimeEnv } from "../utils/runtime-env";
import { dbEnv } from "./db";

/**
 * Web app environment preset
 */
export const webEnv = createEnv({
	extends: [dbEnv],
	server: observabilityModule.server,
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
