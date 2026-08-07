import { createEnv } from "@t3-oss/env-core";
import { baseEnv } from "../base";
import {
	authModule,
	emailsModule,
	observabilityModule,
	triggerModule,
	urlsModule,
} from "../modules";
import { createServerRuntimeEnv } from "../utils/runtime-env";
import { dbEnv } from "./db";

/**
 * API app environment preset
 */
export const apiEnv = createEnv({
	extends: [dbEnv, baseEnv],
	server: {
		...authModule.server,
		...emailsModule.server,
		...observabilityModule.server,
		...triggerModule.server,
	},
	client: {
		...emailsModule.client,
		...urlsModule.client,
	},
	clientPrefix: "NEXT_PUBLIC_",
	runtimeEnv: createServerRuntimeEnv(),
	emptyStringAsUndefined: true,
	skipValidation:
		process.env.SKIP_ENV_VALIDATION === "true" ||
		process.env.NODE_ENV === "test",
});

// @trigger.dev/sdk reads process.env.TRIGGER_SECRET_KEY / TRIGGER_PROJECT_REF
// directly (its own unprefixed convention). scripts/with-root-env.mjs does
// this same aliasing for local dev and build, but only as a shell wrapper —
// Vercel's serverless runtime invokes the compiled function directly per
// request, never through that wrapper, so it's done here instead where every
// request path is guaranteed to import apiEnv before handling anything.
if (!process.env.TRIGGER_SECRET_KEY && apiEnv.HARMONIA_TRIGGER_SECRET_KEY) {
	process.env.TRIGGER_SECRET_KEY = apiEnv.HARMONIA_TRIGGER_SECRET_KEY;
}
if (!process.env.TRIGGER_PROJECT_REF && apiEnv.HARMONIA_TRIGGER_PROJECT_REF) {
	process.env.TRIGGER_PROJECT_REF = apiEnv.HARMONIA_TRIGGER_PROJECT_REF;
}
