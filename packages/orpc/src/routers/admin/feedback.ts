import {
	feedbackAdminListInput,
	feedbackAdminListOutputSchema,
} from "@harmonia/common/schemas";
import { db } from "@harmonia/db";
import { user } from "@harmonia/db/schema/auth";
import { feedback } from "@harmonia/db/schema/feedback";
import { count, desc, eq, ilike, or } from "drizzle-orm";
import { adminProcedure } from "../../procedures";

export const adminFeedbackRouter = {
	list: adminProcedure
		.input(feedbackAdminListInput)
		.output(feedbackAdminListOutputSchema)
		.handler(async ({ input }) => {
			const { page, pageSize, q } = input;
			const offset = (page - 1) * pageSize;

			const where = q
				? or(ilike(feedback.message, `%${q}%`), ilike(user.email, `%${q}%`))
				: undefined;

			const [items, totalRows] = await Promise.all([
				db
					.select({
						id: feedback.id,
						message: feedback.message,
						rating: feedback.rating,
						source: feedback.source,
						campaignKey: feedback.campaignKey,
						createdAt: feedback.createdAt,
						userEmail: user.email,
						userName: user.name,
					})
					.from(feedback)
					.leftJoin(user, eq(feedback.userId, user.id))
					.where(where)
					.orderBy(desc(feedback.createdAt))
					.limit(pageSize)
					.offset(offset),
				db
					.select({ total: count() })
					.from(feedback)
					.leftJoin(user, eq(feedback.userId, user.id))
					.where(where),
			]);

			const total = totalRows[0]?.total ?? 0;

			return {
				items,
				total,
				page,
				pageSize,
				pageCount: Math.ceil(total / pageSize),
			};
		}),
};
