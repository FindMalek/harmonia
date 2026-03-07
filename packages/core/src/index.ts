import {
	auth as authSingleton,
	initializeAuth,
	type AuthEnvConfig,
} from "@harmonia/auth";
import { db as dbSingleton } from "@harmonia/db";
import { apiEnv } from "@harmonia/env/presets/api";

/**
 * Core initialization module
 *
 * This module initializes all server-side dependencies (database, auth)
 * and exports them as singletons. This is the single source of truth
 * for server initialization, ensuring proper dependency order and
 * eliminating circular dependencies.
 *
 * Initialization happens automatically when the module is imported.
 * The exports are initialized lazily on first access.
 *
 * Usage:
 * ```ts
 * import { database, auth } from "@harmonia/core";
 * // Both are automatically initialized and ready to use
 * ```
 */

let authInitialized = false;

/**
 * Get the database instance
 */
export function getDatabase() {
	return dbSingleton;
}

/**
 * Get the auth instance, initializing it if needed
 */
export function getAuth() {
	if (!authInitialized) {
		getDatabase();

		const envConfig: AuthEnvConfig = {
			BETTER_AUTH_SECRET: apiEnv.BETTER_AUTH_SECRET,
			NEXT_PUBLIC_API_URL: apiEnv.NEXT_PUBLIC_API_URL,
			NEXT_PUBLIC_DASHBOARD_URL: apiEnv.NEXT_PUBLIC_DASHBOARD_URL,
			NEXT_PUBLIC_ALLOWED_ORIGIN: apiEnv.NEXT_PUBLIC_ALLOWED_ORIGIN,
			SPOTIFY_CLIENT_ID: apiEnv.SPOTIFY_CLIENT_ID,
			SPOTIFY_CLIENT_SECRET: apiEnv.SPOTIFY_CLIENT_SECRET,
			VERCEL: apiEnv.VERCEL,
			VERCEL_BRANCH_URL: apiEnv.VERCEL_BRANCH_URL,
			VERCEL_PROJECT_PRODUCTION_URL: apiEnv.VERCEL_PROJECT_PRODUCTION_URL,
		};

		initializeAuth(dbSingleton, envConfig);
		authInitialized = true;
	}
	return authSingleton;
}

export const database = getDatabase();
export const auth = getAuth();
