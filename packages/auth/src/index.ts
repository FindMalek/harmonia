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
	baseURL: env.BETTER_AUTH_URL,
	database: drizzleAdapter(db, {
		provider: "pg",

		schema: schema,
	}),
	trustedOrigins: [
		env.CORS_ORIGIN,
		env.BETTER_AUTH_URL,
		"http://localhost:3001",
		"http://127.0.0.1:3001",
	],
	emailAndPassword: {
		enabled: true,
	},
	socialProviders:
		spotifyEnabled && spotifyClientId && spotifyClientSecret
			? {
					spotify: {
						clientId: spotifyClientId,
						clientSecret: spotifyClientSecret,
						redirectURI: `${env.BETTER_AUTH_URL}/api/auth/callback/spotify`,
						scopes: [
							"user-read-email",
							"user-read-private",
							"user-library-read",
						],
					},
				}
			: {},
	plugins: [nextCookies()],
});
