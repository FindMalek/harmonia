import { env } from "@harmonia/env/dashboard";

const LOCAL_FALLBACK = "http://127.0.0.1:3003";

export function getSiteUrl(): string {
	if (env.NEXT_PUBLIC_HARMONIA_DASHBOARD_URL) {
		return env.NEXT_PUBLIC_HARMONIA_DASHBOARD_URL;
	}
	if (env.NEXT_PUBLIC_HARMONIA_NODE_ENV === "production") {
		throw new Error(
			"NEXT_PUBLIC_HARMONIA_DASHBOARD_URL is required in production — metadata and OpenGraph must not publish a localhost URL.",
		);
	}
	return LOCAL_FALLBACK;
}
