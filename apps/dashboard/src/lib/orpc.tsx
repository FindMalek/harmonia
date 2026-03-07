import { createORPCClientUtils } from "@harmonia/orpc/client";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { env } from "@/lib/env";

export const queryClient = new QueryClient({
	queryCache: new QueryCache({
		onError: (error, query) => {
			const message = error.message;
			const fullText = `Error: ${message}`;
			toast.error(fullText, {
				action: (
					<div className="flex gap-1">
						<button
							type="button"
							className="rounded px-2 py-1 font-medium text-xs hover:bg-black/10 dark:hover:bg-white/10"
							onClick={async (e) => {
								e.preventDefault();
								try {
									await navigator.clipboard.writeText(fullText);
									toast.success("Copied");
								} catch {
									toast.error("Failed to copy");
								}
							}}
						>
							Copy
						</button>
						<button
							type="button"
							className="rounded px-2 py-1 font-medium text-xs hover:bg-black/10 dark:hover:bg-white/10"
							onClick={() => query.invalidate()}
						>
							Retry
						</button>
					</div>
				),
			});
		},
	}),
});

const { client, link } = createORPCClientUtils({
	apiUrl: env.NEXT_PUBLIC_API_URL,
	getHeaders: async () => {
		if (typeof window !== "undefined") {
			return {};
		}
		const { headers } = await import("next/headers");
		return Object.fromEntries(await headers());
	},
});

export { link, client };
export const orpc = createTanstackQueryUtils(client);
