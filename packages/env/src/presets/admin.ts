import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";
import { clientModule, observabilityModule, urlsModule } from "../modules";
import { createNextjsRuntimeEnv } from "../utils/runtime-env";
import { dbEnv } from "./db";

export const adminEnv = createEnv({
	extends: [dbEnv],
	server: {
		HARMONIA_BETTER_AUTH_SECRET: z.string().min(32),
		...observabilityModule.server,
	},
	client: {
		...clientModule.client,
		...urlsModule.client,
	},
	runtimeEnv: {
		...createNextjsRuntimeEnv(),
		HARMONIA_BETTER_AUTH_SECRET: process.env.HARMONIA_BETTER_AUTH_SECRET,
	},
	emptyStringAsUndefined: true,
	skipValidation:
		process.env.SKIP_ENV_VALIDATION === "true" ||
		process.env.NODE_ENV === "test",
});
