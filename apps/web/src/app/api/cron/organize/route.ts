import { env } from "@harmonia/env/server";
import { logger } from "@harmonia/logger";
import type { NextRequest } from "next/server";

async function handler(_req: NextRequest) {
	const cronSecret = env.CRON_SECRET;

	if (!cronSecret) {
		logger.warn(
			{},
			"CRON_SECRET is not configured; /api/cron/organize will not run pipeline",
		);
		return new Response("Cron not configured", { status: 503 });
	}

	const authHeader = _req.headers.get("authorization");
	const expected = `Bearer ${cronSecret}`;

	if (authHeader !== expected) {
		logger.warn(
			{},
			"Unauthorized attempt to hit /api/cron/organize cron endpoint",
		);
		return new Response("Unauthorized", { status: 401 });
	}

	const body = JSON.stringify({
		json: {
			userId: env.CRON_USER_ID ?? undefined,
		},
		meta: [],
	});

	const response = await fetch(`${env.BETTER_AUTH_URL}/api/rpc/organize/run`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"X-Organize-Secret": cronSecret,
		},
		body,
	});

	if (!response.ok) {
		logger.error(
			{ status: response.status, statusText: response.statusText },
			"Organize cron call failed",
		);
		return new Response("Failed to trigger organize pipeline", {
			status: 500,
		});
	}

	return new Response("OK", { status: 200 });
}

export const POST = handler;
