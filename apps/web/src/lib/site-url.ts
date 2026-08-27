import { env } from "@sonaraem/env/web";

const LOCAL_FALLBACK = "http://127.0.0.1:3001";

export function getSiteUrl(): string {
	if (env.NEXT_PUBLIC_SONARAEM_WEB_URL) {
		return env.NEXT_PUBLIC_SONARAEM_WEB_URL;
	}
	if (env.NEXT_PUBLIC_SONARAEM_NODE_ENV === "production") {
		throw new Error(
			"NEXT_PUBLIC_SONARAEM_WEB_URL is required in production — metadata, OpenGraph, and the sitemap must not publish a localhost URL.",
		);
	}
	return LOCAL_FALLBACK;
}
