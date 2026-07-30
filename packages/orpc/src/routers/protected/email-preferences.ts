import {
	emailPreferencesOutputSchema,
	emailPreferencesUpdateInput,
	emptyInput,
} from "@harmonia/common/schemas";
import { ensureUserEmailPreferences } from "@harmonia/common/services/email";
import { db } from "@harmonia/db";
import { userEmailPreferences } from "@harmonia/db/schema/user-email-preferences";
import { eq } from "drizzle-orm";

import { approvedProcedure } from "../../procedures";

export const emailPreferencesRouter = {
	get: approvedProcedure
		.input(emptyInput)
		.output(emailPreferencesOutputSchema)
		.handler(async ({ context }) => {
			const userId = context.session.user.id;
			const prefs = await ensureUserEmailPreferences(userId);

			return {
				transactionalEnabled: prefs.transactionalEnabled,
				productUpdatesEnabled: prefs.productUpdatesEnabled,
				marketingEnabled: prefs.marketingEnabled,
				feedbackEnabled: prefs.feedbackEnabled,
				unsubscribedAt: prefs.unsubscribedAt ?? null,
			};
		}),
	update: approvedProcedure
		.input(emailPreferencesUpdateInput)
		.output(emailPreferencesOutputSchema)
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;
			await ensureUserEmailPreferences(userId);

			const updates = {
				...(input.transactionalEnabled !== undefined && {
					transactionalEnabled: input.transactionalEnabled,
				}),
				...(input.productUpdatesEnabled !== undefined && {
					productUpdatesEnabled: input.productUpdatesEnabled,
				}),
				...(input.marketingEnabled !== undefined && {
					marketingEnabled: input.marketingEnabled,
				}),
				...(input.feedbackEnabled !== undefined && {
					feedbackEnabled: input.feedbackEnabled,
				}),
				...(input.marketingEnabled === false
					? { unsubscribedAt: new Date() }
					: input.marketingEnabled === true
						? { unsubscribedAt: null }
						: {}),
			};

			const [updated] = await db
				.update(userEmailPreferences)
				.set(updates)
				.where(eq(userEmailPreferences.userId, userId))
				.returning();

			const prefs = updated ?? (await ensureUserEmailPreferences(userId));
			return {
				transactionalEnabled: prefs.transactionalEnabled,
				productUpdatesEnabled: prefs.productUpdatesEnabled,
				marketingEnabled: prefs.marketingEnabled,
				feedbackEnabled: prefs.feedbackEnabled,
				unsubscribedAt: prefs.unsubscribedAt ?? null,
			};
		}),
};
