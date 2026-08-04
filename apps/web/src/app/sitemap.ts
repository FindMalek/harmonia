import { WEB_ROUTES } from "@harmonia/common/utils/routes";
import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
	const siteUrl = getSiteUrl();
	const lastModified = new Date();

	return Object.values(WEB_ROUTES).map((route) => ({
		url: `${siteUrl}${route.path}`,
		lastModified,
		changeFrequency: "monthly",
		priority: route.path === "/" ? 1 : 0.5,
	}));
}
