import { createAuthClient } from "better-auth/react";
import { env } from "@/lib/env";

// refetchOnWindowFocus disabled: better-auth defaults to 7-day sessions, so
// expired-on-focus is rare. Sessions re-validate on navigation / API calls.
export const authClient = createAuthClient({
	baseURL: env.NEXT_PUBLIC_HARMONIA_API_URL,
	sessionOptions: {
		refetchOnWindowFocus: false,
	},
});
