import { createContext, appRouter, type Context } from "@harmonia/orpc";
import { logger } from "@harmonia/logger";
import { flushTelemetry } from "@harmonia/tracing";
import { getCorsHeaders } from "@/lib/cors";
import { getErrorMessage, safeErrorPayload } from "@/lib/payload";
import { applyCors, jsonResponse } from "@/lib/response";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import type {
	StandardHandleResult,
	StandardHandlerInterceptorOptions,
} from "@orpc/server/standard";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import type { NextRequest } from "next/server";
import { env } from "@harmonia/env";
export const dynamic = "force-dynamic";

let lastError: Error | null = null;

type ErrorInterceptor = (
	options: StandardHandlerInterceptorOptions<Context> & {
		next: (
			opts?: StandardHandlerInterceptorOptions<Context>,
		) => Promise<StandardHandleResult>;
	},
) => Promise<StandardHandleResult>;

function createErrorInterceptor(label: string): ErrorInterceptor {
	return async (options) => {
		try {
			return await options.next();
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));
			logger.error(safeErrorPayload(error), label);
			throw error;
		}
	};
}

const rpcErrorInterceptor = createErrorInterceptor("RPC error");
const apiErrorInterceptor = createErrorInterceptor("OpenAPI error");

const rpcHandler = new RPCHandler(appRouter, {
	interceptors: [rpcErrorInterceptor],
});

const apiHandler = new OpenAPIHandler(appRouter, {
	plugins: [
		new OpenAPIReferencePlugin({
			schemaConverters: [new ZodToJsonSchemaConverter()],
			specGenerateOptions: {
				info: {
					title: "Harmonia API",
					version: "1.0.0",
					description: "API documentation and playground for Harmonia",
				},
			},
		}),
	],
	interceptors: [apiErrorInterceptor],
});

function maybeDevErrorResponse(
	response: Response,
	corsHeaders: Record<string, string>,
): Response {
	if (
		process.env.NODE_ENV !== "development" ||
		response.status !== 500 ||
		!lastError
	) {
		return response;
	}
	const message = getErrorMessage(lastError);
	if (!message) return response;
	return jsonResponse({ message }, 500, corsHeaders);
}

async function handleRequest(req: NextRequest) {
	lastError = null;
	const corsHeaders = await getCorsHeaders(req.headers.get("origin"));

	if (req.method === "OPTIONS") {
		return new Response(null, {
			status: 204,
			headers: corsHeaders,
		});
	}

	try {
		const context = await createContext(req.headers);

		const rpcResult = await rpcHandler.handle(req, {
			prefix: "/api/rpc",
			context,
		});
		if (rpcResult.response) {
			const withCors = applyCors(rpcResult.response, corsHeaders);
			return maybeDevErrorResponse(withCors, corsHeaders);
		}

		const apiResult = await apiHandler.handle(req, {
			prefix: "/api/rpc/api-reference",
			context,
		});
		if (apiResult.response) {
			const withCors = applyCors(apiResult.response, corsHeaders);
			return maybeDevErrorResponse(withCors, corsHeaders);
		}

		return new Response("Not found", {
			status: 404,
			headers: corsHeaders,
		});
	} finally {
		if (process.env.VERCEL) {
			try {
				await flushTelemetry();
			} catch {
				logger.error(
					new Error("Failed to flush telemetry"),
					"Failed to flush telemetry",
				);
			}
		}
	}
}

export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
export const OPTIONS = handleRequest;
