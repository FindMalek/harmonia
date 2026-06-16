import { adminStatsOutputSchema } from "@harmonia/common/schemas";
import { db } from "@harmonia/db";
import { user } from "@harmonia/db/schema/auth";
import { track } from "@harmonia/db/schema/track";
import { waitlistSignup } from "@harmonia/db/schema/waitlist-signup";
import { count } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure } from "../../procedures";

export const adminStatsRouter = {
	overview: adminProcedure
		.input(z.void())
		.output(adminStatsOutputSchema)
		.handler(async () => {
			const [userCountRows, trackCountRows, waitlistByStatus] =
				await Promise.all([
					db.select({ total: count() }).from(user),
					db.select({ total: count() }).from(track),
					db
						.select({ status: waitlistSignup.status, total: count() })
						.from(waitlistSignup)
						.groupBy(waitlistSignup.status),
				]);

			const byStatus = Object.fromEntries(
				waitlistByStatus.map((r) => [r.status, r.total]),
			);

			return {
				totalUsers: userCountRows[0]?.total ?? 0,
				totalTracks: trackCountRows[0]?.total ?? 0,
				waitlistTotal: waitlistByStatus.reduce((s, r) => s + r.total, 0),
				waitlistPending: byStatus.pending ?? 0,
				waitlistApproved: byStatus.approved ?? 0,
				waitlistRejected: byStatus.rejected ?? 0,
			};
		}),
};
