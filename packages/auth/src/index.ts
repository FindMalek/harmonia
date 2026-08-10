import { tryAutoApproveByEmail } from "@harmonia/common/services/waitlist";
import { sendWelcomeEmailTask } from "@harmonia/common/trigger/tasks/emails/send-welcome";
import { buildTrustedOrigins } from "@harmonia/common/utils/origin";
import * as schema from "@harmonia/db/schema/auth";
import { logger } from "@harmonia/logger";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";

export type AuthVariant = "dashboard" | "admin";

/**
 * Environment config required for auth initialization
 */
export type AuthEnvConfig = {
	HARMONIA_BETTER_AUTH_SECRET: string;
	NEXT_PUBLIC_HARMONIA_API_URL: string;
	NEXT_PUBLIC_HARMONIA_DASHBOARD_URL?: string;
	NEXT_PUBLIC_HARMONIA_ADMIN_URL?: string;
	NEXT_PUBLIC_HARMONIA_ALLOWED_ORIGIN?: string;
	HARMONIA_SPOTIFY_CLIENT_ID?: string;
	HARMONIA_SPOTIFY_CLIENT_SECRET?: string;
	VERCEL?: boolean;
	VERCEL_BRANCH_URL?: string;
	VERCEL_PROJECT_PRODUCTION_URL?: string;
};

function buildCrossSubDomainCookies(envConfig: AuthEnvConfig) {
	if (!envConfig.VERCEL) {
		return undefined;
	}
	try {
		const hostname = new URL(envConfig.NEXT_PUBLIC_HARMONIA_API_URL).hostname;
		const parts = hostname.split(".");
		if (parts.length < 2) {
			return undefined;
		}
		const domain = parts.slice(-2).join(".");
		return { enabled: true as const, domain };
	} catch {
		return undefined;
	}
}

function buildAuthAdvanced(envConfig: AuthEnvConfig, variant: AuthVariant) {
	const crossSubDomainCookies = buildCrossSubDomainCookies(envConfig);
	return {
		cookiePrefix:
			variant === "dashboard" ? "harmonia-dashboard" : "harmonia-admin",
		...(crossSubDomainCookies ? { crossSubDomainCookies } : {}),
	};
}

function buildTrustedOriginsList(envConfig: AuthEnvConfig) {
	const originConfig = [
		envConfig.NEXT_PUBLIC_HARMONIA_API_URL,
		envConfig.NEXT_PUBLIC_HARMONIA_DASHBOARD_URL,
		envConfig.NEXT_PUBLIC_HARMONIA_ADMIN_URL,
		envConfig.VERCEL_BRANCH_URL,
		envConfig.VERCEL_PROJECT_PRODUCTION_URL,
	].filter((origin): origin is string => origin !== undefined);

	return buildTrustedOrigins(
		originConfig,
		!!envConfig.VERCEL,
		envConfig.NEXT_PUBLIC_HARMONIA_ALLOWED_ORIGIN,
	);
}

/**
 * Runs on every Spotify account link/re-link (first sign-in and every
 * return visit) — covers the case where someone was approved but never
 * clicked their invite email, only signed in directly. Note: Spotify's
 * profile email is self-reported, not independently verified — see the
 * security note on tryAutoApproveByEmail for why this is still an accepted
 * tradeoff here.
 */
async function autoApproveIfWaitlisted(accountUserId: string): Promise<void> {
	try {
		await tryAutoApproveByEmail(accountUserId);
	} catch (err) {
		logger.warn(
			{
				userId: accountUserId,
				error: err instanceof Error ? err.message : String(err),
			},
			"Failed to auto-approve from waitlist on Spotify sign-in",
		);
	}
}

const sharedUserFields = {
	additionalFields: {
		hasCompletedOnboarding: {
			type: "boolean" as const,
			required: false,
			defaultValue: false,
			input: false,
		},
		isApproved: {
			type: "boolean" as const,
			required: false,
			defaultValue: false,
			input: false,
		},
	},
};

/**
 * Dashboard auth: Spotify OAuth + dashboard session cookie.
 */
export function createDashboardAuth(
	database: Parameters<typeof drizzleAdapter>[0],
	envConfig: AuthEnvConfig,
) {
	const spotifyClientId = envConfig.HARMONIA_SPOTIFY_CLIENT_ID;
	const spotifyClientSecret = envConfig.HARMONIA_SPOTIFY_CLIENT_SECRET;
	const spotifyEnabled = !!spotifyClientId && !!spotifyClientSecret;

	return betterAuth({
		baseURL: envConfig.NEXT_PUBLIC_HARMONIA_API_URL,
		basePath: "/api/auth",
		secret: envConfig.HARMONIA_BETTER_AUTH_SECRET,
		advanced: buildAuthAdvanced(envConfig, "dashboard"),
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
			account: {
				create: {
					after: async (createdAccount) => {
						if (createdAccount.providerId !== "spotify") return;
						await autoApproveIfWaitlisted(createdAccount.userId);
					},
				},
				update: {
					after: async (updatedAccount) => {
						if (updatedAccount.providerId !== "spotify") return;
						await autoApproveIfWaitlisted(updatedAccount.userId);
					},
				},
			},
		},
		user: sharedUserFields,
		trustedOrigins: buildTrustedOriginsList(envConfig),
		emailAndPassword: {
			enabled: true,
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
		plugins: [nextCookies(), admin({ defaultRole: "user" })],
	});
}

/**
 * Admin auth: email/password only + separate session cookie.
 */
export function createAdminAuth(
	database: Parameters<typeof drizzleAdapter>[0],
	envConfig: AuthEnvConfig,
) {
	return betterAuth({
		baseURL: envConfig.NEXT_PUBLIC_HARMONIA_API_URL,
		basePath: "/api/admin-auth",
		secret: envConfig.HARMONIA_BETTER_AUTH_SECRET,
		advanced: buildAuthAdvanced(envConfig, "admin"),
		database: drizzleAdapter(database, {
			provider: "pg",
			schema,
		}),
		user: sharedUserFields,
		trustedOrigins: buildTrustedOriginsList(envConfig),
		emailAndPassword: {
			enabled: true,
			// Closed for good — the one admin account is created via admin.setup.create instead.
			disableSignUp: true,
		},
		socialProviders: {},
		plugins: [nextCookies(), admin({ defaultRole: "user" })],
	});
}

/** @deprecated Use createDashboardAuth — kept for backwards compatibility */
export function createAuth(
	database: Parameters<typeof drizzleAdapter>[0],
	envConfig: AuthEnvConfig,
) {
	return createDashboardAuth(database, envConfig);
}

export type DashboardAuth = ReturnType<typeof createDashboardAuth>;
export type AdminAuth = ReturnType<typeof createAdminAuth>;
export type Auth = DashboardAuth;

export let dashboardAuth: DashboardAuth;
export let adminAuth: AdminAuth;

/** Alias for dashboardAuth */
export let auth: Auth;

export function initializeAuth(
	database: Parameters<typeof createDashboardAuth>[0],
	envConfig: AuthEnvConfig,
): void {
	dashboardAuth = createDashboardAuth(database, envConfig);
	adminAuth = createAdminAuth(database, envConfig);
	auth = dashboardAuth;
}
