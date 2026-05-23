import { apiEnv } from "@harmonia/env/presets/api";
import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
	// standard Trigger.dev var, not in @harmonia/env — fall back to it when HARMONIA_TRIGGER_PROJECT_REF is unset
	project: apiEnv.HARMONIA_TRIGGER_PROJECT_REF ?? process.env.TRIGGER_PROJECT_REF ?? "",
	dirs: ["./src/trigger"],
	maxDuration: 1800,
	retries: {
		enabledInDev: false,
		default: {
			maxAttempts: 1,
		},
	},
});
