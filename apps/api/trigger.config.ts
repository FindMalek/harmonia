import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
	project: process.env.TRIGGER_PROJECT_REF ?? "",
	dirs: ["./src/trigger"],
	maxDuration: 1800,
	retries: {
		enabledInDev: false,
		default: {
			maxAttempts: 1,
		},
	},
});
