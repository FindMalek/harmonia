import "@sonaraem/env/dashboard";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	typedRoutes: true,
	reactCompiler: true,
	allowedDevOrigins: ["127.0.0.1"],
	images: {
		remotePatterns: [
			{ protocol: "https", hostname: "i.scdn.co", pathname: "/**" },
			{ protocol: "https", hostname: "mosaic.scdn.co", pathname: "/**" },
		],
	},
};

export default nextConfig;
