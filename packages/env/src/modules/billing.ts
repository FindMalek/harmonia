import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const billingModule = createEnv({
	server: {
		POLAR_ACCESS_TOKEN: z.string().optional(),
		POLAR_ORGANIZATION_ID: z.string().optional(),
		POLAR_WEBHOOK_SECRET: z.string().optional(),
	},
	clientPrefix: "NEXT_PUBLIC_",
	client: {
		NEXT_PUBLIC_POLAR_CHECKOUT_URL: z.string().optional(),
	},
	runtimeEnv: process.env,
});
