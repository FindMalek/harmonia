import { createContext, appRouter } from "@harmonia/orpc";
import { logger } from "@harmonia/logger";
import { flushTelemetry } from "@harmonia/tracing";
import { getCorsHeaders } from "@/lib/cors";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

function getErrorMessage(error: unknown): string | undefined {
	if (error instanceof Error) return error.message;
	if (error != null) return String(error);
	return undefined;
}

function safeErrorPayload(error: unknown): {
	message: string;
	stack?: string;
	causeMessage?: string;
	code?: string;
} {
	const err = error instanceof Error ? error : new Error(String(error));
	const cause =
		err.cause ??
		(error &&
			typeof error === "object" &&
			"cause" in error &&
			(error as { cause?: unknown }).cause);
	const causeMessage =
		cause instanceof Error
			? cause.message
			: cause != null
				? String(cause)
				: undefined;
	const code =
		error && typeof error === "object" && "code" in error
			? (error as { code?: string }).code
			: undefined;
	return {
		message: err.message,
		stack: err.stack,
		...(causeMessage !== undefined && { causeMessage }),
		...(code !== undefined && { code }),
	};
}

let lastRpcError: Error | null = null;

const rpcHandler = new RPCHandler(appRouter, {
	interceptors: [
		onError((error: unknown) => {
			const err = error instanceof Error ? error : new Error(String(error));
			lastRpcError = err;
			logger.error(safeErrorPayload(error), "RPC error");
		}),
	],
});
const apiHandler = new OpenAPIHandler(appRouter, {
	plugins: [
		new OpenAPIReferencePlugin({
			schemaConverters: [new ZodToJsonSchemaConverter()],
		}),
	],
	interceptors: [
		onError((error: unknown) => {
			const err = error instanceof Error ? error : new Error(String(error));
			lastRpcError = err;
			logger.error(safeErrorPayload(error), "OpenAPI error");
		}),
	],
});

async function handleRequest(req: NextRequest) {
	lastRpcError = null;
	const origin = req.headers.get("origin");
	const corsHeaders = await getCorsHeaders(origin);

	try {
		// OPTIONS preflight
		if (req.method === "OPTIONS") {
			return new Response(null, {
				status: 204,
				headers: corsHeaders,
			});
		}

		const rpcResult = await rpcHandler.handle(req, {
			prefix: "/api/rpc",
			context: await createContext(req.headers),
		});
		if (rpcResult.response) {
			const errMsg = getErrorMessage(lastRpcError);
			if (
				process.env.NODE_ENV === "development" &&
				rpcResult.response.status === 500 &&
				errMsg
			) {
				const body = JSON.stringify({ message: errMsg });
				return new Response(body, {
					status: 500,
					headers: { "Content-Type": "application/json", ...corsHeaders },
				});
			}
			const resHeaders = new Headers(rpcResult.response.headers);
			for (const [k, v] of Object.entries(corsHeaders)) {
				resHeaders.set(k, v);
			}
			return new Response(rpcResult.response.body, {
				status: rpcResult.response.status,
				statusText: rpcResult.response.statusText,
				headers: resHeaders,
			});
		}

		const apiResult = await apiHandler.handle(req, {
			prefix: "/api/rpc/api-reference",
			context: await createContext(req.headers),
		});
		if (apiResult.response) {
			const errMsg = getErrorMessage(lastRpcError);
			if (
				process.env.NODE_ENV === "development" &&
				apiResult.response.status === 500 &&
				errMsg
			) {
				const body = JSON.stringify({ message: errMsg });
				return new Response(body, {
					status: 500,
					headers: { "Content-Type": "application/json", ...corsHeaders },
				});
			}
			const resHeaders = new Headers(apiResult.response.headers);
			for (const [k, v] of Object.entries(corsHeaders)) {
				resHeaders.set(k, v);
			}
			return new Response(apiResult.response.body, {
				status: apiResult.response.status,
				statusText: apiResult.response.statusText,
				headers: resHeaders,
			});
		}

		return new Response("Not found", {
			status: 404,
			headers: corsHeaders,
		});
	} finally {
		if (process.env.VERCEL) {
			await flushTelemetry();
		}
	}
}

export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
export const OPTIONS = handleRequest;
