import { ORPCError } from "@orpc/server";
import {
	submitFeedbackInput,
	submitFeedbackOutputSchema,
} from "@sonaraem/common/schemas";
import { db } from "@sonaraem/db";
import { feedback } from "@sonaraem/db/schema/feedback";

import { approvedProcedure } from "../../procedures";

export const feedbackRouter = {
	submit: approvedProcedure
		.input(submitFeedbackInput)
		.output(submitFeedbackOutputSchema)
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;

			const [inserted] = await db
				.insert(feedback)
				.values({
					userId,
					message: input.message,
					rating: input.rating ?? null,
					source: input.source,
					campaignKey: input.campaignKey ?? null,
				})
				.returning({ id: feedback.id });

			if (!inserted) {
				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "Failed to save feedback",
				});
			}

			return { success: true, id: inserted.id };
		}),
};
