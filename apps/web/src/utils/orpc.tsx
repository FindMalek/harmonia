import { env } from "@harmonia/env/web";
import { createORPCClientUtils } from "@harmonia/orpc/client";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const queryClient = new QueryClient({
	queryCache: new QueryCache({
		onError: (error, query) => {
			const message = error.message;
			const fullText = `Error: ${message}`;
			toast.error(fullText, {
				// Raw <button> is deliberate here, not a missed shadcn conversion —
				// these render inside a Sonner toast's compact action slot, where
				// Button's base classes (border, rounded-none, focus ring) fight
				// the toast's own minimal layout for no real benefit.
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
	apiUrl: env.NEXT_PUBLIC_HARMONIA_API_URL,
	getHeaders: async () => {
		if (typeof window !== "undefined") {
			return {};
		}
		const { headers } = await import("next/headers");
		return Object.fromEntries(await headers());
	},
});

export { client, link };
export const orpc = createTanstackQueryUtils(client);
