import { auth } from "@harmonia/core";
import { getCorsHeaders } from "@/lib/cors";
import { toNextJsHandler } from "better-auth/next-js";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const { GET: authGet, POST: authPost } = toNextJsHandler(auth.handler);

function withCors(
	handler: (
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

		const response = await handler(req, context);
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

export const GET = withCors(authGet);
export const POST = withCors(authPost);
export const OPTIONS = async (req: NextRequest) => {
	const origin = req.headers.get("origin");
	const corsHeaders = await getCorsHeaders(origin);
	return new Response(null, {
		status: 204,
		headers: corsHeaders,
	});
};