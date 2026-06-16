import {
	adminUserListInput,
	adminUserListOutputSchema,
} from "@harmonia/common/schemas";
import { db } from "@harmonia/db";
import { user } from "@harmonia/db/schema/auth";
import { count, desc, ilike, or } from "drizzle-orm";

import { adminProcedure } from "../../procedures";

export const adminUsersRouter = {
	list: adminProcedure
		.input(adminUserListInput)
		.output(adminUserListOutputSchema)
		.handler(async ({ input }) => {
			const { page, pageSize, q } = input;
			const offset = (page - 1) * pageSize;

			const where = q
				? or(ilike(user.email, `%${q}%`), ilike(user.name, `%${q}%`))
				: undefined;

			const [items, totalRows] = await Promise.all([
				db
					.select({
						id: user.id,
						name: user.name,
						email: user.email,
						emailVerified: user.emailVerified,
						role: user.role,
						createdAt: user.createdAt,
					})
					.from(user)
					.where(where)
					.orderBy(desc(user.createdAt))
					.limit(pageSize)
					.offset(offset),
				db.select({ total: count() }).from(user).where(where),
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
