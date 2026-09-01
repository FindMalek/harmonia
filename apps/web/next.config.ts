import "@sonaraem/env/presets/web";
import type { NextConfig } from "next";

const dashboardUrl = process.env.NEXT_PUBLIC_SONARAEM_DASHBOARD_URL?.replace(
	/\/$/,
	"",
);

const nextConfig: NextConfig = {
	typedRoutes: true,
	allowedDevOrigins: ["127.0.0.1"],
	reactCompiler: true,
	async redirects() {
		return [
			{
				source: "/login",
				destination: `${dashboardUrl}/login`,
				permanent: false,
			},
		];
	},
};

export default nextConfig;
