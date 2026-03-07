import { logger } from "@harmonia/logger";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

async function handler(_req: NextRequest) {
	const { env } = await import("@harmonia/env/server");
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

	const apiUrl = env.BETTER_AUTH_URL;
	const response = await fetch(`${apiUrl}/api/rpc/organize/run`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"X-Organize-Secret": cronSecret,
		},
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
