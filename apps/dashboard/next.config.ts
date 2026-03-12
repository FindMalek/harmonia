import "@harmonia/env/dashboard";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	typedRoutes: true,
	reactCompiler: true,
	allowedDevOrigins: ["localhost:3000", "localhost:3003", "127.0.0.1:3003"],
};

export default nextConfig;
