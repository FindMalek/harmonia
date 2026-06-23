"use client";

import { adminClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { env } from "@/lib/env";

export const authClient = createAuthClient({
	baseURL: env.NEXT_PUBLIC_HARMONIA_API_URL,
	basePath: "/api/admin-auth",
	plugins: [adminClient()],
	sessionOptions: {
		refetchOnWindowFocus: false,
	},
});
