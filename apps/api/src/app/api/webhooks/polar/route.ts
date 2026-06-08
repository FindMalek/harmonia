import { env } from "@harmonia/env/server";
import { db } from "@harmonia/db";
import { user } from "@harmonia/db/schema/auth";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { validateEvent } from "@polar-sh/sdk/webhooks";

export async function POST(req: Request) {
	const body = await req.text();
	const headersList = await headers();
	const signature = headersList.get("polar-webhook-signature");

	if (!signature || !env.POLAR_WEBHOOK_SECRET) {
		return new NextResponse("Webhook secret or signature missing", { status: 401 });
	}

	let event;
	try {
		event = validateEvent(body, signature, env.POLAR_WEBHOOK_SECRET);
	} catch (error) {
		console.error("[POLAR_WEBHOOK_VERIFICATION_ERROR]", error);
		return new NextResponse("Invalid signature", { status: 400 });
	}

	try {
		if (event.type === "subscription.created" || event.type === "subscription.updated") {
			const subscription = event.data;
			const userId = subscription.metadata?.userId as string;

			if (userId) {
				await db.update(user)
					.set({
						plan: subscription.status === "active" ? "pro" : "free",
						planExpiresAt: subscription.current_period_end ? new Date(subscription.current_period_end) : null,
						polarCustomerId: subscription.customer_id,
						polarSubscriptionId: subscription.id,
					})
					.where(eq(user.id, userId));
			}
		}

		if (event.type === "subscription.revoked") {
			const subscription = event.data;
			const userId = subscription.metadata?.userId as string;

			if (userId) {
				await db.update(user)
					.set({
						plan: "free",
						planExpiresAt: new Date(),
					})
					.where(eq(user.id, userId));
			}
		}

		return new NextResponse("OK", { status: 200 });
	} catch (error) {
		console.error("[POLAR_WEBHOOK_HANDLER_ERROR]", error);
		return new NextResponse("Internal Error", { status: 500 });
	}
}
