import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	typedRoutes: true,
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
