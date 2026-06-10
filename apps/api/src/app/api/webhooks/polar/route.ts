import { env } from "@harmonia/env/server";
import { db } from "@harmonia/db";
import { user } from "@harmonia/db/schema/auth";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { validateEvent } from "@polar-sh/sdk/webhooks";

/**
 * Handles incoming Polar.sh webhooks for subscription lifecycle events.
 *
 * Validates the webhook signature using the Polar SDK and processes
 * subscription creation, updates, and revocations to keep the user's
 * plan and expiration date synchronized in the database.
 *
 * @param req - The Request object containing the webhook payload.
 * @returns A NextResponse indicating the processing outcome.
 */
export async function POST(req: Request) {
	const body = await req.text();
	const headersList = await headers();
	const signature = headersList.get("polar-webhook-signature");

	if (!signature || !env.POLAR_WEBHOOK_SECRET) {
		return new NextResponse("Webhook secret or signature missing", {
			status: 401,
		});
	}

	try {
		const headersObj = Object.fromEntries(headersList.entries());
		const event = validateEvent(body, headersObj, env.POLAR_WEBHOOK_SECRET);

		if (
			event.type === "subscription.created" ||
			event.type === "subscription.updated"
		) {
			const subscription = event.data;
			const userId = subscription.metadata?.userId;

			if (typeof userId === "string") {
				await db
					.update(user)
					.set({
						plan: subscription.status === "active" ? "pro" : "free",
						planExpiresAt: subscription.currentPeriodEnd
							? new Date(subscription.currentPeriodEnd)
							: null,
						polarCustomerId: subscription.customerId,
						polarSubscriptionId: subscription.id,
					})
					.where(eq(user.id, userId));
			}
		}

		if (event.type === "subscription.revoked") {
			const subscription = event.data;
			const userId = subscription.metadata?.userId;

			if (typeof userId === "string") {
				await db
					.update(user)
					.set({
						plan: "free",
						planExpiresAt: null,
					})
					.where(eq(user.id, userId));
			}
		}

		return new NextResponse("OK", { status: 200 });
	} catch (error) {
		console.error("[POLAR_WEBHOOK_ERROR]", error);
		return new NextResponse(
			error instanceof Error ? error.message : "Internal Error",
			{ status: error instanceof Error && error.message.includes("signature") ? 400 : 500 },
		);
	}
}
