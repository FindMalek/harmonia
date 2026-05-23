import { db } from "@harmonia/db";
import { emailSuppression } from "@harmonia/db/schema/email-suppression";
import { userEmailPreferences } from "@harmonia/db/schema/user-email-preferences";
import { eq } from "drizzle-orm";

import type { EmailTemplateKey } from "../../schemas";

export type EmailPolicyDecision = {
	allowed: boolean;
	reason:
		| "allowed"
		| "missing_email"
		| "suppressed"
		| "marketing_opt_out"
		| "feedback_opt_out";
};

const MARKETING_TEMPLATES = new Set<EmailTemplateKey>([
	"marketing_feature_update",
]);
const FEEDBACK_TEMPLATES = new Set<EmailTemplateKey>(["feedback_3day"]);

export async function ensureUserEmailPreferences(userId: string) {
	const [existing] = await db
		.select()
		.from(userEmailPreferences)
		.where(eq(userEmailPreferences.userId, userId));

	if (existing) {
		return existing;
	}

	const [created] = await db
		.insert(userEmailPreferences)
		.values({ userId })
		.returning();

	if (!created) {
		throw new Error("Failed to initialize user email preferences");
	}

	return created;
}

export async function evaluateEmailPolicy({
	userId,
	email,
	templateKey,
}: {
	userId: string;
	email: string | null;
	templateKey: EmailTemplateKey;
}): Promise<EmailPolicyDecision> {
	if (!email) {
		return { allowed: false, reason: "missing_email" };
	}

	const [suppressed] = await db
		.select({ id: emailSuppression.id })
		.from(emailSuppression)
		.where(eq(emailSuppression.email, email.toLowerCase()));

	if (suppressed) {
		return { allowed: false, reason: "suppressed" };
	}

	const prefs = await ensureUserEmailPreferences(userId);

	if (MARKETING_TEMPLATES.has(templateKey) && !prefs.marketingEnabled) {
		return { allowed: false, reason: "marketing_opt_out" };
	}

	if (FEEDBACK_TEMPLATES.has(templateKey) && !prefs.feedbackEnabled) {
		return { allowed: false, reason: "feedback_opt_out" };
	}

	return { allowed: true, reason: "allowed" };
}

export async function upsertEmailSuppression({
	email,
	reason,
	source,
}: {
	email: string;
	reason: string;
	source?: string;
}) {
	const normalizedEmail = email.toLowerCase();
	const [existing] = await db
		.select({ id: emailSuppression.id })
		.from(emailSuppression)
		.where(eq(emailSuppression.email, normalizedEmail));

	if (existing) {
		await db
			.update(emailSuppression)
			.set({ reason, source, suppressedAt: new Date() })
			.where(eq(emailSuppression.id, existing.id));
		return;
	}

	await db.insert(emailSuppression).values({
		email: normalizedEmail,
		reason,
		source,
	});
}
