import path from "node:path";
import { fileURLToPath } from "node:url";

import { config } from "dotenv";
import type { NextConfig } from "next";

// Load root .env when not on Vercel (Vercel injects env automatically)
if (!process.env.VERCEL) {
	const __dirname = path.dirname(fileURLToPath(import.meta.url));
	config({ path: path.resolve(__dirname, "../../.env") });
}

const nextConfig: NextConfig = {
	typedRoutes: true,
	serverExternalPackages: ["pino", "pino-pretty", "thread-stream"],
	redirects: async () => {
		return [
			{
				source: "/",
				destination: "/api",
				permanent: true,
			},
		];
	},
	// Ensure env vars are available during build (workers may not inherit process.env)
	env: {
		NEXT_PUBLIC_API_URL:
			process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002",
		NEXT_PUBLIC_ALLOWED_ORIGIN: process.env.NEXT_PUBLIC_ALLOWED_ORIGIN ?? "*",
	},
};

export default nextConfig;
