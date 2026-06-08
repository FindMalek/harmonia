import { env } from "@harmonia/env/server";
import { Polar } from "@polar-sh/sdk";

/**
 * Polar.sh SDK instance
 */
export const polar = new Polar({
	accessToken: env.POLAR_ACCESS_TOKEN ?? "",
	server: process.env.NODE_ENV === "development" ? "sandbox" : "production",
});
