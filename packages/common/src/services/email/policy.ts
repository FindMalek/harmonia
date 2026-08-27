import { db } from "@sonaraem/db";
import { emailSuppression } from "@sonaraem/db/schema/email-suppression";
import { userEmailPreferences } from "@sonaraem/db/schema/user-email-preferences";
import { eq } from "drizzle-orm";

import type { EmailTemplateKey } from "../../schemas";
import { getEmailTemplateCategory } from "./categories";

export type EmailPolicyDecision = {
	allowed: boolean;
	reason:
		| "allowed"
		| "missing_email"
		| "suppressed"
		| "transactional_opt_out"
		| "product_updates_opt_out"
		| "marketing_opt_out"
		| "feedback_opt_out";
};

export async function isEmailSuppressed(email: string): Promise<boolean> {
	const [suppressed] = await db
		.select({ id: emailSuppression.id })
		.from(emailSuppression)
		.where(eq(emailSuppression.email, email.toLowerCase()));

	return Boolean(suppressed);
}

export async function ensureUserEmailPreferences(userId: string) {
	await db
		.insert(userEmailPreferences)
		.values({ userId })
		.onConflictDoNothing({ target: userEmailPreferences.userId });

	const [prefs] = await db
		.select()
		.from(userEmailPreferences)
		.where(eq(userEmailPreferences.userId, userId));

	if (!prefs) {
		throw new Error("Failed to load or initialize user email preferences");
	}

	return prefs;
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

	if (await isEmailSuppressed(email)) {
		return { allowed: false, reason: "suppressed" };
	}

	const prefs = await ensureUserEmailPreferences(userId);
	const category = getEmailTemplateCategory(templateKey);

	switch (category) {
		case "transactional":
			if (!prefs.transactionalEnabled) {
				return { allowed: false, reason: "transactional_opt_out" };
			}
			break;
		case "security":
			break;
		case "billing":
			break;
		case "feedback":
			if (!prefs.feedbackEnabled) {
				return { allowed: false, reason: "feedback_opt_out" };
			}
			break;
		case "product_update":
			if (!prefs.productUpdatesEnabled) {
				return { allowed: false, reason: "product_updates_opt_out" };
			}
			break;
		case "marketing":
			if (!prefs.marketingEnabled) {
				return { allowed: false, reason: "marketing_opt_out" };
			}
			break;
		default: {
			const _exhaustive: never = category;
			return _exhaustive;
		}
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
	await db
		.insert(emailSuppression)
		.values({
			email: normalizedEmail,
			reason,
			source,
			suppressedAt: new Date(),
		})
		.onConflictDoUpdate({
			target: emailSuppression.email,
			set: {
				reason,
				source,
				suppressedAt: new Date(),
			},
		});
}
