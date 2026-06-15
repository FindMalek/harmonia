import { env } from "@harmonia/env/server";
import { Polar } from "@polar-sh/sdk";

/**
 * Polar.sh SDK instance
 */
export const polar = new Polar({
	accessToken: env.HARMONIA_POLAR_ACCESS_TOKEN,
	server:
		env.NEXT_PUBLIC_HARMONIA_NODE_ENV === "production"
			? "production"
			: "sandbox",
});
