import { db } from "@harmonia/db";
import { emailSendLog } from "@harmonia/db/schema/email-send-log";
import { and, eq } from "drizzle-orm";

import type { EmailSendStatus, EmailTemplateKey } from "../../schemas";

export type EmailDeliveryReservation = {
	created: boolean;
	logId: number | null;
};

export async function reserveEmailDelivery({
	userId,
	email,
	templateKey,
	idempotencyKey,
	metadata,
}: {
	userId: string | null;
	email: string;
	templateKey: EmailTemplateKey;
	idempotencyKey: string;
	metadata?: Record<string, unknown>;
}): Promise<EmailDeliveryReservation> {
	const [created] = await db
		.insert(emailSendLog)
		.values({
			userId,
			email,
			templateKey,
			idempotencyKey,
			status: "queued",
			metadata: metadata ?? null,
		})
		.onConflictDoNothing({ target: emailSendLog.idempotencyKey })
		.returning({ id: emailSendLog.id });

	if (created) {
		return { created: true, logId: created.id };
	}

	// Row already exists. The only safe retry is reclaiming a row that
	// genuinely failed, via an atomic UPDATE...WHERE so a concurrent caller
	// can't also win the same claim. "queued" (an attempt may be in flight)
	// or "sent" (already delivered) must never be treated as retryable —
	// that gap previously let concurrent/duplicate callers each pass a
	// plain status check and physically send more than once.
	const [reclaimed] = await db
		.update(emailSendLog)
		.set({ status: "queued" })
		.where(
			and(
				eq(emailSendLog.idempotencyKey, idempotencyKey),
				eq(emailSendLog.status, "failed"),
			),
		)
		.returning({ id: emailSendLog.id });

	if (reclaimed) {
		return { created: true, logId: reclaimed.id };
	}

	const [existing] = await db
		.select({ id: emailSendLog.id })
		.from(emailSendLog)
		.where(eq(emailSendLog.idempotencyKey, idempotencyKey));

	return { created: false, logId: existing?.id ?? null };
}

export async function markEmailDelivery({
	idempotencyKey,
	status,
	providerMessageId,
	error,
	skipReason,
}: {
	idempotencyKey: string;
	status: EmailSendStatus;
	providerMessageId?: string | null;
	error?: string | null;
	skipReason?: string | null;
}): Promise<void> {
	await db
		.update(emailSendLog)
		.set({
			status,
			providerMessageId: providerMessageId ?? null,
			error: error ?? null,
			skipReason: skipReason ?? null,
			sentAt: status === "sent" ? new Date() : null,
		})
		.where(eq(emailSendLog.idempotencyKey, idempotencyKey));
}
