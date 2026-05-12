import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	typedRoutes: true,
	allowedDevOrigins: ["127.0.0.1"],
	serverExternalPackages: ["pino", "pino-pretty", "thread-stream"],
	redirects: async () => {
		return [
			{
				source: "/api",
				destination: "/api/rpc/api-reference",
				permanent: true,
			},
		];
	},
};

export default nextConfig;
