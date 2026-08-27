import { createORPCClientUtils } from "@sonaraem/orpc/client";
import { env } from "@/lib/env";

// Server-only ORPC client — safe for use in route handlers and server actions.
// Forwards all request headers (including session cookie) automatically.
const { client } = createORPCClientUtils({
	apiUrl: env.NEXT_PUBLIC_SONARAEM_API_URL,
	getHeaders: async () => {
		const { headers } = await import("next/headers");
		return Object.fromEntries(await headers());
	},
});

export { client as serverClient };
