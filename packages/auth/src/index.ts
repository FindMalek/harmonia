import { db } from "@harmonia/db";
import * as schema from "@harmonia/db/schema/auth";
import { env } from "@harmonia/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

const spotifyClientId = env.SPOTIFY_CLIENT_ID;
const spotifyClientSecret = env.SPOTIFY_CLIENT_SECRET;
const spotifyEnabled = !!spotifyClientId && !!spotifyClientSecret;

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",

		schema: schema,
	}),
	trustedOrigins: [env.CORS_ORIGIN],
	emailAndPassword: {
		enabled: true,
	},
	socialProviders:
		spotifyEnabled && spotifyClientId && spotifyClientSecret
			? {
					spotify: {
						clientId: spotifyClientId,
						clientSecret: spotifyClientSecret,
					},
				}
			: {},
	plugins: [nextCookies()],
});
