import { env } from "@harmonia/env/web";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
	baseURL:
		env.NEXT_PUBLIC_APP_URL ??
		(typeof window !== "undefined" ? window.location.origin : ""),
});
