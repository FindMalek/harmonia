import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

/**
 * Base environment with shared variables used across all apps/packages
 * This is the foundation that all presets extend from
 */
export const baseEnv = createEnv({
	server: {
		VERCEL_BRANCH_URL: z.string().optional(),
		VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),
		VERCEL_REGION: z.string().optional(),
		VERCEL_DEPLOYMENT_ID: z.string().optional(),
		VERCEL_PROJECT_ID: z.string().optional(),
		VERCEL: z
			.string()
			.optional()
			.transform((val) => val === "1"),
	},
	client: {
		NEXT_PUBLIC_NODE_ENV: z
			.enum(["development", "production", "local"])
			.default("local")
			.transform((val) => {
				if (process.env.VERCEL_ENV === "preview") return "development";
				return val;
			}),
		NEXT_PUBLIC_API_URL: z.url(),
		NEXT_PUBLIC_ALLOWED_ORIGIN: z
			.string()
			.optional()
			.refine(
				(val) => {
					if (!val) return true;
					if (val === "*") return true;
					try {
						new URL(val);
						return true;
					} catch {
						// Not a URL, check wildcard pattern
					}
					if (val.includes("*")) {
						const dnsLabel =
							/^(\*|[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)$/;
						const labels = val.split(".");
						if (labels.length < 2) return false;
						for (const label of labels) {
							if (!dnsLabel.test(label)) return false;
						}
						if (val.startsWith("*") && !val.startsWith("*.")) {
							return false;
						}
						return true;
					}
					return false;
				},
				{
					message:
						"NEXT_PUBLIC_ALLOWED_ORIGIN must be '*', a valid URL, or a wildcard pattern like *.domain.com",
				},
			),
	},
	clientPrefix: "NEXT_PUBLIC_",
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
	skipValidation:
		process.env.SKIP_ENV_VALIDATION === "true" ||
		process.env.NODE_ENV === "test",
});
