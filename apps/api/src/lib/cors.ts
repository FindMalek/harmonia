import { apiEnv } from "@harmonia/env";

/**
 * Build CORS headers for a given origin.
 * Only allows explicit origins (web, dashboard, API) - no wildcards.
 * Uses dynamic import to avoid loading env during build (workers may not have process.env).
 */
export async function getCorsHeaders(
	origin: string | null,
): Promise<Record<string, string>> {
	const allowedOrigins: string[] = [];
	for (const url of [
		apiEnv.NEXT_PUBLIC_API_URL,
		apiEnv.NEXT_PUBLIC_WEB_URL,
		apiEnv.NEXT_PUBLIC_DASHBOARD_URL,
	]) {
		if (url) {
			try {
				allowedOrigins.push(new URL(url).origin);
			} catch {
				// ignore invalid URL
			}
		}
	}

	const allowed = origin && allowedOrigins.includes(origin);

	const headers: Record<string, string> = {
		"Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type, Authorization",
		"Access-Control-Max-Age": "86400",
	};

	if (allowed && origin) {
		headers["Access-Control-Allow-Origin"] = origin;
		headers["Access-Control-Allow-Credentials"] = "true";
	}

	return headers;
}
