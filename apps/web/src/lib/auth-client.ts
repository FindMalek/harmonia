import { env } from "@harmonia/env/web";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
	baseURL: env.NEXT_PUBLIC_API_URL,
});
