/**
 * Fallback for NEXT_PUBLIC_API_URL when migrating from legacy env vars
 */
function getApiUrlFallback() {
	return (
		process.env.NEXT_PUBLIC_API_URL ??
		process.env.BETTER_AUTH_URL ??
		process.env.CORS_ORIGIN ??
		process.env.NEXT_PUBLIC_APP_URL
	);
}

/**
 * Server-side runtime env with fallbacks (for api preset, server routes)
 */
export function createServerRuntimeEnv(): NodeJS.ProcessEnv {
	return {
		...process.env,
		NEXT_PUBLIC_API_URL: getApiUrlFallback(),
		NEXT_PUBLIC_ALLOWED_ORIGIN:
			process.env.NEXT_PUBLIC_ALLOWED_ORIGIN ??
			process.env.CORS_ORIGIN ??
			process.env.BETTER_AUTH_URL ??
			getApiUrlFallback(),
	};
}

/**
 * Helper to create runtimeEnv object for Next.js presets
 * MUST use literal property access for Next.js bundling to work
 */
export function createNextjsRuntimeEnv() {
	return {
		DATABASE_URL: process.env.DATABASE_URL,
		NEXT_PUBLIC_NODE_ENV: process.env.NEXT_PUBLIC_NODE_ENV,
		NEXT_PUBLIC_API_URL: getApiUrlFallback(),
		NEXT_PUBLIC_ALLOWED_ORIGIN:
			process.env.NEXT_PUBLIC_ALLOWED_ORIGIN ??
			process.env.CORS_ORIGIN ??
			process.env.BETTER_AUTH_URL,
		NEXT_PUBLIC_WEB_URL:
			process.env.NEXT_PUBLIC_WEB_URL ??
			process.env.BETTER_AUTH_URL ??
			process.env.CORS_ORIGIN,
		NEXT_PUBLIC_DASHBOARD_URL: process.env.NEXT_PUBLIC_DASHBOARD_URL,
		SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID,
		OTEL_SERVICE_NAME: process.env.OTEL_SERVICE_NAME,
		OTEL_SAMPLING_RATE: process.env.OTEL_SAMPLING_RATE,
		OTEL_ENABLED: process.env.OTEL_ENABLED,
		OTEL_EXPORTER_OTLP_ENDPOINT: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
		OTEL_EXPORTER_OTLP_TRACES_ENDPOINT:
			process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
		OTEL_EXPORTER_OTLP_METRICS_ENDPOINT:
			process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT,
		OTEL_EXPORTER_OTLP_LOGS_ENDPOINT:
			process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT,
		OTEL_EXPORTER_OTLP_HEADERS: process.env.OTEL_EXPORTER_OTLP_HEADERS,
		OTEL_EXPORTER_OTLP_PROTOCOL: process.env.OTEL_EXPORTER_OTLP_PROTOCOL,
		OTEL_EXPORTER_OTLP_COMPRESSION: process.env.OTEL_EXPORTER_OTLP_COMPRESSION,
	} as const;
}
