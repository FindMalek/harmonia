import { env } from "@sonaraem/env/admin";

const LOCAL_FALLBACK = "http://127.0.0.1:3004";

export function getSiteUrl(): string {
	if (env.NEXT_PUBLIC_SONARAEM_ADMIN_URL) {
		return env.NEXT_PUBLIC_SONARAEM_ADMIN_URL;
	}
	if (env.NEXT_PUBLIC_SONARAEM_NODE_ENV === "production") {
		throw new Error(
			"NEXT_PUBLIC_SONARAEM_ADMIN_URL is required in production — metadata must not publish a localhost URL.",
		);
	}
	return LOCAL_FALLBACK;
}
