import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
	// process.env, not apiEnv — apiEnv validates the entire api schema eagerly, which `trigger deploy` in CI doesn't have.
	project:
		process.env.SONARAEM_TRIGGER_PROJECT_REF ??
		process.env.TRIGGER_PROJECT_REF ??
		"",
	dirs: ["./src/trigger"],
	maxDuration: 1800,
	retries: {
		enabledInDev: false,
		default: {
			maxAttempts: 1,
		},
	},
});
