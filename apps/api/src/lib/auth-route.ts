import type { toNextJsHandler } from "better-auth/next-js";
import type { NextRequest } from "next/server";

import { getCorsHeaders } from "@/lib/cors";

type AuthHandler = ReturnType<typeof toNextJsHandler>;

export function createAuthRouteHandlers(handler: AuthHandler) {
	function withCors(
		routeHandler: (
			req: NextRequest,
			context: { params: Promise<{ all: string[] }> },
		) => Promise<Response>,
	) {
		return async (
			req: NextRequest,
			context: { params: Promise<{ all: string[] }> },
		) => {
			const origin = req.headers.get("origin");
			const corsHeaders = await getCorsHeaders(origin);

			if (req.method === "OPTIONS") {
				return new Response(null, {
					status: 204,
					headers: corsHeaders,
				});
			}

			const response = await routeHandler(req, context);
			const resHeaders = new Headers(response.headers);
			for (const [k, v] of Object.entries(corsHeaders)) {
				resHeaders.set(k, v);
			}
			return new Response(response.body, {
				status: response.status,
				statusText: response.statusText,
				headers: resHeaders,
			});
		};
	}

	return {
		GET: withCors(handler.GET),
		POST: withCors(handler.POST),
		OPTIONS: async (req: NextRequest) => {
			const origin = req.headers.get("origin");
			const corsHeaders = await getCorsHeaders(origin);
			return new Response(null, {
				status: 204,
				headers: corsHeaders,
			});
		},
	};
}
