import { env } from "@harmonia/env/web";
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
	const siteUrl = env.NEXT_PUBLIC_HARMONIA_WEB_URL ?? "http://127.0.0.1:3001";

	return {
		rules: {
			userAgent: "*",
			allow: "/",
		},
		sitemap: `${siteUrl}/sitemap.xml`,
	};
}
