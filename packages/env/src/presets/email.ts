import { createEnv } from "@t3-oss/env-nextjs";
import {
	clientModule,
	emailsModule,
	observabilityModule,
	urlsModule,
} from "../modules";
import { createNextjsRuntimeEnv } from "../utils/runtime-env";
import { dbEnv } from "./db";

export const emailEnv = createEnv({
	extends: [dbEnv],
	server: {
		...emailsModule.server,
		...observabilityModule.server,
	},
	client: {
		...clientModule.client,
		...emailsModule.client,
		...urlsModule.client,
	},
	runtimeEnv: createNextjsRuntimeEnv(),
	emptyStringAsUndefined: true,
	skipValidation:
		process.env.SKIP_ENV_VALIDATION === "true" ||
		process.env.NODE_ENV === "test",
});
