/**
 * Check if an origin matches the allowed origin pattern
 * Supports wildcard patterns like *.vercel.app or exact matches
 */
export function isOriginAllowed(
	origin: string | null,
	allowedOriginPattern: string | undefined,
): boolean {
	if (!origin || !allowedOriginPattern) return false;

	// Extract hostname from origin (remove protocol and port)
	let hostname: string = origin;
	try {
		const url = new URL(origin);
		hostname = url.hostname || origin;
	} catch {
		hostname = origin.replace(/^https?:\/\//, "").split(":")[0] || origin;
	}

	// Exact match
	if (hostname === allowedOriginPattern || origin === allowedOriginPattern) {
		return true;
	}

	// Wildcard pattern matching (e.g., *.vercel.app)
	if (allowedOriginPattern.includes("*")) {
		const safePatternRegex =
			/^\*?\.?[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
		if (!safePatternRegex.test(allowedOriginPattern)) {
			return false;
		}

		const regexPattern = allowedOriginPattern
			.replace(/\./g, "\\.")
			.replace(/\*/g, ".*");
		const regex = new RegExp(`^${regexPattern}$`);
		return regex.test(hostname);
	}

	return false;
}

/**
 * Check if an origin is allowed based on base origins and optional pattern
 * Returns true if origin matches any base origin OR matches the pattern
 */
export function isOriginAllowedForRequest(
	origin: string | null,
	baseOrigins: string[],
	allowedOriginPattern?: string,
): boolean {
	if (!origin) return false;

	if (baseOrigins.includes(origin)) {
		return true;
	}

	if (allowedOriginPattern) {
		return isOriginAllowed(origin, allowedOriginPattern);
	}

	return false;
}

/**
 * Build trusted origins configuration for Better Auth
 * Returns either a static array or a dynamic function that validates origins
 */
export function buildTrustedOrigins(
	baseOrigins: string[],
	isVercel: boolean,
	allowedOriginPattern?: string,
): string[] | ((request?: Request) => string[] | Promise<string[]>) {
	if (isVercel && allowedOriginPattern) {
		return (request?: Request) => {
			if (!request) {
				return baseOrigins;
			}
			const origin = request.headers.get("origin");
			if (
				origin &&
				isOriginAllowedForRequest(origin, baseOrigins, allowedOriginPattern)
			) {
				return [...baseOrigins, origin];
			}
			return baseOrigins;
		};
	}

	return baseOrigins;
}
