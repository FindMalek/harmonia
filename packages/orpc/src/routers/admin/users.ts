import {
	adminUserListInput,
	adminUserListOutputSchema,
} from "@sonaraem/common/schemas";
import { db } from "@sonaraem/db";
import { user } from "@sonaraem/db/schema/auth";
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
						isApproved: user.isApproved,
						banned: user.banned,
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
				items: items.map((item) => ({
					...item,
					banned: item.banned ?? false,
				})),
				total,
				page,
				pageSize,
				pageCount: Math.ceil(total / pageSize),
			};
		}),
};
