import "@harmonia/env/presets/web";
import type { NextConfig } from "next";

const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL?.replace(/\/$/, "");

const nextConfig: NextConfig = {
	typedRoutes: true,
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
