import { isOriginAllowedForRequest } from "@harmonia/common";

/**
 * Build CORS headers for a given origin.
 * Uses apiEnv and isOriginAllowedForRequest to validate the origin.
 * Uses dynamic import to avoid loading env during build (workers may not have process.env).
 */
export async function getCorsHeaders(
	origin: string | null,
): Promise<Record<string, string>> {
	const { apiEnv } = await import("@harmonia/env/presets/api");
	const baseOrigins: string[] = [];
	const apiUrl = apiEnv.NEXT_PUBLIC_API_URL;
	if (apiUrl) {
		try {
			const url = new URL(apiUrl);
			baseOrigins.push(url.origin);
		} catch {
			// ignore invalid URL
		}
	}

	const allowed = origin
		? isOriginAllowedForRequest(
				origin,
				baseOrigins,
				apiEnv.NEXT_PUBLIC_ALLOWED_ORIGIN,
			)
		: false;

	const headers: Record<string, string> = {
		"Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type, Authorization",
		"Access-Control-Max-Age": "86400",
	};

	if (allowed && origin) {
		headers["Access-Control-Allow-Origin"] = origin;
		headers["Access-Control-Allow-Credentials"] = "true";
	} else if (apiEnv.NEXT_PUBLIC_ALLOWED_ORIGIN === "*") {
		headers["Access-Control-Allow-Origin"] = "*";
	}

	return headers;
}
