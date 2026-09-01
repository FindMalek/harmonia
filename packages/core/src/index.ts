import {
	type AuthEnvConfig,
	adminAuth as adminAuthSingleton,
	dashboardAuth as dashboardAuthSingleton,
	initializeAuth,
} from "@sonaraem/auth";
import { db as dbSingleton } from "@sonaraem/db";
import { apiEnv } from "@sonaraem/env/presets/api";

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
 * import { database, dashboardAuth, adminAuth } from "@sonaraem/core";
 * ```
 */

let authInitialized = false;

function buildAuthEnvConfig(): AuthEnvConfig {
	return {
		SONARAEM_BETTER_AUTH_SECRET: apiEnv.SONARAEM_BETTER_AUTH_SECRET,
		NEXT_PUBLIC_SONARAEM_API_URL: apiEnv.NEXT_PUBLIC_SONARAEM_API_URL,
		NEXT_PUBLIC_SONARAEM_DASHBOARD_URL:
			apiEnv.NEXT_PUBLIC_SONARAEM_DASHBOARD_URL,
		NEXT_PUBLIC_SONARAEM_ADMIN_URL: apiEnv.NEXT_PUBLIC_SONARAEM_ADMIN_URL,
		NEXT_PUBLIC_SONARAEM_ALLOWED_ORIGIN:
			apiEnv.NEXT_PUBLIC_SONARAEM_ALLOWED_ORIGIN,
		SONARAEM_SPOTIFY_CLIENT_ID: apiEnv.SONARAEM_SPOTIFY_CLIENT_ID,
		SONARAEM_SPOTIFY_CLIENT_SECRET: apiEnv.SONARAEM_SPOTIFY_CLIENT_SECRET,
		VERCEL: apiEnv.VERCEL,
		VERCEL_BRANCH_URL: apiEnv.VERCEL_BRANCH_URL,
		VERCEL_PROJECT_PRODUCTION_URL: apiEnv.VERCEL_PROJECT_PRODUCTION_URL,
	};
}

/**
 * Get the database instance
 */
export function getDatabase() {
	return dbSingleton;
}

function ensureAuthInitialized() {
	if (!authInitialized) {
		getDatabase();
		initializeAuth(dbSingleton, buildAuthEnvConfig());
		authInitialized = true;
	}
}

/**
 * Get the dashboard auth instance, initializing if needed
 */
export function getDashboardAuth() {
	ensureAuthInitialized();
	return dashboardAuthSingleton;
}

/**
 * Get the admin auth instance, initializing if needed
 */
export function getAdminAuth() {
	ensureAuthInitialized();
	return adminAuthSingleton;
}

/** @deprecated Use getDashboardAuth */
export function getAuth() {
	return getDashboardAuth();
}

export const database = getDatabase();
export const dashboardAuth = getDashboardAuth();
export const adminAuth = getAdminAuth();
/** Alias for dashboardAuth */
export const auth = getAuth();
