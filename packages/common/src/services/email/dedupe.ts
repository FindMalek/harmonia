import { db } from "@harmonia/db";
import { emailSendLog } from "@harmonia/db/schema/email-send-log";
import { eq } from "drizzle-orm";

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

	const [existing] = await db
		.select({ id: emailSendLog.id, status: emailSendLog.status })
		.from(emailSendLog)
		.where(eq(emailSendLog.idempotencyKey, idempotencyKey));

	if (existing?.status === "sent") {
		return { created: false, logId: existing.id };
	}

	// Previous attempt didn't make it to "sent" (queued/failed/skipped) - allow retry on the same row.
	return { created: true, logId: existing?.id ?? null };
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
