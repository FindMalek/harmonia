import { createContext } from "@harmonia/api/context";
import { appRouter } from "@harmonia/api/routers/index";
import { env } from "@harmonia/env/server";
import { logger } from "@harmonia/logger";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import type { NextRequest } from "next/server";

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

// Dev-only: last error for 500 response body. Concurrent requests can overwrite.
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
	const rpcResult = await rpcHandler.handle(req, {
		prefix: "/api/rpc",
		context: await createContext(req),
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
				headers: { "Content-Type": "application/json" },
			});
		}
		return rpcResult.response;
	}

	const apiResult = await apiHandler.handle(req, {
		prefix: "/api/rpc/api-reference",
		context: await createContext(req),
	});
	if (apiResult.response) {
		const errMsg = getErrorMessage(lastRpcError);
		if (
			env.NODE_ENV === "development" &&
			apiResult.response.status === 500 &&
			errMsg
		) {
			const body = JSON.stringify({ message: errMsg });
			return new Response(body, {
				status: 500,
				headers: { "Content-Type": "application/json" },
			});
		}
		return apiResult.response;
	}

	return new Response("Not found", { status: 404 });
}

export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
