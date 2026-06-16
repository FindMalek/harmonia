import {
	adminStatsOutputSchema,
	waitlistStatusEnum,
} from "@harmonia/common/schemas";
import { db } from "@harmonia/db";
import { user } from "@harmonia/db/schema/auth";
import { track } from "@harmonia/db/schema/track";
import { waitlistSignup } from "@harmonia/db/schema/waitlist-signup";
import { count, eq } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure } from "../../procedures";

export const adminStatsRouter = {
	overview: adminProcedure
		.input(z.void())
		.output(adminStatsOutputSchema)
		.handler(async () => {
			const [
				userCountRows,
				trackCountRows,
				waitlistCountRows,
				pendingCountRows,
				approvedCountRows,
				rejectedCountRows,
			] = await Promise.all([
				db.select({ total: count() }).from(user),
				db.select({ total: count() }).from(track),
				db.select({ total: count() }).from(waitlistSignup),
				db
					.select({ total: count() })
					.from(waitlistSignup)
					.where(eq(waitlistSignup.status, waitlistStatusEnum.enum.pending)),
				db
					.select({ total: count() })
					.from(waitlistSignup)
					.where(eq(waitlistSignup.status, waitlistStatusEnum.enum.approved)),
				db
					.select({ total: count() })
					.from(waitlistSignup)
					.where(eq(waitlistSignup.status, waitlistStatusEnum.enum.rejected)),
			]);

			return {
				totalUsers: userCountRows[0]?.total ?? 0,
				totalTracks: trackCountRows[0]?.total ?? 0,
				waitlistTotal: waitlistCountRows[0]?.total ?? 0,
				waitlistPending: pendingCountRows[0]?.total ?? 0,
				waitlistApproved: approvedCountRows[0]?.total ?? 0,
				waitlistRejected: rejectedCountRows[0]?.total ?? 0,
			};
		}),
};
