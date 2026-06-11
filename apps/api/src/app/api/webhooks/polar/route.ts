import { NextResponse } from "next/server";
import { billingModule } from "@harmonia/env";
import { db } from "@harmonia/db";
import { user as userTable } from "@harmonia/db/schema/auth";
import { eq } from "drizzle-orm";
import { validateWebhooks } from "@polar-sh/sdk";

interface PolarWebhookEvent {
	type: string;
	data: {
		id: string;
		customer_id?: string;
		user_id?: string;
		custom_fields?: Record<string, string>;
		ends_at?: string;
		user?: {
			id: string;
			email: string;
		};
		customer?: {
			id: string;
			email: string;
		};
	};
}

export async function POST(req: Request) {
	const rawBody = await req.text();
	const signature = req.headers.get("webhook-signature") || "";
	const polarWebhookSecret = billingModule.POLAR_WEBHOOK_SECRET || "";

	// Валидируем сигнатуру вебхука от Polar.sh для защиты от злоумышленников
	if (polarWebhookSecret) {
		try {
			// Воспользуемся верификацией вебхуков Polar.sh
			validateWebhooks({
				requestBody: rawBody,
				signature: signature,
				secret: polarWebhookSecret,
			});
		} catch (err) {
			console.error("Webhook signature verification failed:", err);
			return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
		}
	}

	try {
		const body = JSON.parse(rawBody) as PolarWebhookEvent;
		const eventType = body.type;

		// Сначала пробуем вытащить ID юзера из кастомных полей (более надежный способ)
		// Если его там нет — откатываемся на email
		const userId = body.data.custom_fields?.userId || body.data.user_id;
		const userEmail = body.data.user?.email || body.data.customer?.email;

		if (!userId && !userEmail) {
			return NextResponse.json({ error: "No user reference or email in payload" }, { status: 400 });
		}

		if (eventType === "subscription.created") {
			// Активируем PRO подписку
			const patchData = {
				plan: "pro",
				planExpiresAt: null, // Бессрочно, пока активна
				polarCustomerId: body.data.customer_id || body.data.customer?.id || null,
				polarSubscriptionId: body.data.id,
			};

			if (userId) {
				await db.update(userTable).set(patchData).where(eq(userTable.id, userId));
			} else if (userEmail) {
				await db.update(userTable).set(patchData).where(eq(userTable.email, userEmail));
			}

		} else if (eventType === "subscription.updated") {
			const expiresAt = body.data.ends_at ? new Date(body.data.ends_at) : null;
			const patchData = {
				planExpiresAt: expiresAt,
				polarSubscriptionId: body.data.id,
			};

			if (userId) {
				await db.update(userTable).set(patchData).where(eq(userTable.id, userId));
			} else if (userEmail) {
				await db.update(userTable).set(patchData).where(eq(userTable.email, userEmail));
			}

		} else if (eventType === "subscription.canceled") {
			// При отмене подписки юзер не должен вылетать сразу!
			// Он остается PRO, пока не наступит дата конца расчетного периода (ends_at)
			const expiresAt = body.data.ends_at ? new Date(body.data.ends_at) : new Date();
			const patchData = {
				plan: "pro", // сохраняем PRO, плагин isPro проверит по дате planExpiresAt
				planExpiresAt: expiresAt,
				polarSubscriptionId: null,
			};

			if (userId) {
				await db.update(userTable).set(patchData).where(eq(userTable.id, userId));
			} else if (userEmail) {
				await db.update(userTable).set(patchData).where(eq(userTable.email, userEmail));
			}
		}

		return NextResponse.json({ received: true });
	} catch (error) {
		console.error("Error processing Polar webhook:", error);
		return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
	}
}
