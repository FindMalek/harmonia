import type { RouterClient } from "@orpc/server";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { AppRouter, PublicRouter } from "./routers/index";

export type AppRouterClient = RouterClient<AppRouter>;
export type PublicRouterClient = RouterClient<PublicRouter>;

export interface CreateORPCClientUtilsOptions {
	/**
	 * Base API URL (e.g. https://api.example.com or http://localhost:3001)
	 * RPC endpoint will be ${apiUrl}/api/rpc
	 */
	apiUrl: string;
	/**
	 * Optional: provide headers for server-side requests (e.g. from next/headers)
	 */
	getHeaders?: () => Promise<Record<string, string>> | Record<string, string>;
}

/**
 * Create oRPC client utilities for both dashboard (full router) and cron (public router only).
 * - url: ${apiUrl}/api/rpc
 * - credentials: "include"
 * - server-side: forwards headers when getHeaders is provided
 */
export function createORPCClientUtils(
	apiUrlOrOptions: string | CreateORPCClientUtilsOptions,
) {
	const options =
		typeof apiUrlOrOptions === "string"
			? { apiUrl: apiUrlOrOptions }
			: apiUrlOrOptions;
	const { apiUrl, getHeaders } = options;
	const baseUrl = `${apiUrl.replace(/\/$/, "")}/api/rpc`;

	const link = new RPCLink({
		url: baseUrl,
		fetch(url, init) {
			return fetch(url, {
				...init,
				credentials: "include",
			});
		},
		headers: async () => {
			const isBrowser =
				typeof (globalThis as { window?: unknown }).window !== "undefined";
			if (isBrowser) {
				return {};
			}
			if (getHeaders) {
				const headers = await Promise.resolve(getHeaders());
				return typeof headers === "object" ? headers : {};
			}
			return {};
		},
	});

	const client = createORPCClient(link) as AppRouterClient;
	const publicClient = client as unknown as PublicRouterClient;

	return {
		link,
		client,
		publicClient,
	};
}
