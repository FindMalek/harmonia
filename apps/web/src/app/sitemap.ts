import { WEB_ROUTES } from "@harmonia/common/utils/routes";
import { env } from "@harmonia/env/web";
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
	const siteUrl = env.NEXT_PUBLIC_HARMONIA_WEB_URL ?? "http://127.0.0.1:3001";
	const lastModified = new Date();

	return Object.values(WEB_ROUTES).map((route) => ({
		url: `${siteUrl}${route.path}`,
		lastModified,
		changeFrequency: "monthly",
		priority: route.path === "/" ? 1 : 0.5,
	}));
}
