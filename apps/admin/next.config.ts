import "@sonaraem/env/admin";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	typedRoutes: true,
	allowedDevOrigins: ["127.0.0.1"],
	serverExternalPackages: ["pino", "pino-pretty"],
};

export default nextConfig;
