import { sendLoginAlertEmailTask } from "@harmonia/common/trigger/tasks/emails/send-login-alert";
import { sendWelcomeEmailTask } from "@harmonia/common/trigger/tasks/emails/send-welcome";
import { buildTrustedOrigins } from "@harmonia/common/utils/origin";
import * as schema from "@harmonia/db/schema/auth";
import { logger } from "@harmonia/logger";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

/**
 * Environment config required for auth initialization
 */
export type AuthEnvConfig = {
	HARMONIA_BETTER_AUTH_SECRET: string;
	NEXT_PUBLIC_HARMONIA_API_URL: string;
	NEXT_PUBLIC_HARMONIA_DASHBOARD_URL?: string;
	NEXT_PUBLIC_HARMONIA_ALLOWED_ORIGIN?: string;
	HARMONIA_SPOTIFY_CLIENT_ID?: string;
	HARMONIA_SPOTIFY_CLIENT_SECRET?: string;
	VERCEL?: boolean;
	VERCEL_BRANCH_URL?: string;
	VERCEL_PROJECT_PRODUCTION_URL?: string;
};

/**
 * Factory function to create a Better Auth instance
 * Uses dependency injection to avoid circular dependencies
 *
 * @param database - Drizzle database instance
 * @param envConfig - Environment config for auth
 * @returns Better Auth instance
 */
export function createAuth(
	database: Parameters<typeof drizzleAdapter>[0],
	envConfig: AuthEnvConfig,
) {
	const spotifyClientId = envConfig.HARMONIA_SPOTIFY_CLIENT_ID;
	const spotifyClientSecret = envConfig.HARMONIA_SPOTIFY_CLIENT_SECRET;
	const spotifyEnabled = !!spotifyClientId && !!spotifyClientSecret;

	const originConfig = [
		envConfig.NEXT_PUBLIC_HARMONIA_API_URL,
		envConfig.NEXT_PUBLIC_HARMONIA_DASHBOARD_URL,
		envConfig.VERCEL_BRANCH_URL,
		envConfig.VERCEL_PROJECT_PRODUCTION_URL,
	].filter((origin): origin is string => origin !== undefined);

	const trustedOrigins = buildTrustedOrigins(
		originConfig,
		!!envConfig.VERCEL,
		envConfig.NEXT_PUBLIC_HARMONIA_ALLOWED_ORIGIN,
	);

	return betterAuth({
		baseURL: envConfig.NEXT_PUBLIC_HARMONIA_API_URL,
		secret: envConfig.HARMONIA_BETTER_AUTH_SECRET,
		database: drizzleAdapter(database, {
			provider: "pg",
			schema,
		}),
		databaseHooks: {
			user: {
				create: {
					after: async (createdUser) => {
						try {
							await sendWelcomeEmailTask.trigger({ userId: createdUser.id });
						} catch (err) {
							logger.warn(
								{
									userId: createdUser.id,
									error: err instanceof Error ? err.message : String(err),
								},
								"Failed to send welcome email",
							);
						}
					},
				},
			},
			session: {
				create: {
					after: async (sessionRow) => {
						try {
							await sendLoginAlertEmailTask.trigger({
								userId: sessionRow.userId,
								loginAtIso: sessionRow.createdAt.toISOString(),
								ipAddress: sessionRow.ipAddress,
								userAgent: sessionRow.userAgent,
							});
						} catch (err) {
							logger.warn(
								{
									userId: sessionRow.userId,
									error: err instanceof Error ? err.message : String(err),
								},
								"Failed to send login alert email",
							);
						}
					},
				},
			},
		},
		user: {
			additionalFields: {
				hasCompletedOnboarding: {
					type: "boolean",
					required: false,
					defaultValue: false,
					input: false,
				},
			},
		},
		trustedOrigins,
		emailAndPassword: {
			enabled: false,
		},
		socialProviders:
			spotifyEnabled && spotifyClientId && spotifyClientSecret
				? {
						spotify: {
							clientId: spotifyClientId,
							clientSecret: spotifyClientSecret,
							redirectURI: `${envConfig.NEXT_PUBLIC_HARMONIA_API_URL}/api/auth/callback/spotify`,
							scope: [
								"user-read-email",
								"user-read-private",
								"user-library-read",
								"playlist-read-private",
								"playlist-read-collaborative",
								"playlist-modify-private",
								"playlist-modify-public",
							],
						},
					}
				: {},
		plugins: [nextCookies()],
	});
}

export type Auth = ReturnType<typeof createAuth>;

/**
 * Singleton auth instance
 * Must be initialized by calling initializeAuth() before use
 * This is initialized by @harmonia/core at app startup
 */
export let auth: Auth;

/**
 * Initialize the auth singleton
 * Called by core initialization module
 * @internal
 */
export function initializeAuth(
	database: Parameters<typeof createAuth>[0],
	envConfig: AuthEnvConfig,
): void {
	auth = createAuth(database, envConfig);
}
