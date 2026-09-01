import { adminStatsOutputSchema } from "@sonaraem/common/schemas";
import { db } from "@sonaraem/db";
import { user } from "@sonaraem/db/schema/auth";
import { pipelineRun } from "@sonaraem/db/schema/pipeline-run";
import { playlist } from "@sonaraem/db/schema/playlist";
import { track } from "@sonaraem/db/schema/track";
import { waitlistSignup } from "@sonaraem/db/schema/waitlist-signup";
import { and, count, eq, isNotNull } from "drizzle-orm";
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
				waitlistByStatus,
				pipelineRunRows,
				completedPipelineRunRows,
				generatedPlaylistRows,
				exportedPlaylistRows,
			] = await Promise.all([
				db.select({ total: count() }).from(user),
				db.select({ total: count() }).from(track),
				db
					.select({ status: waitlistSignup.status, total: count() })
					.from(waitlistSignup)
					.groupBy(waitlistSignup.status),
				db.select({ total: count() }).from(pipelineRun),
				db
					.select({ total: count() })
					.from(pipelineRun)
					.where(eq(pipelineRun.status, "completed")),
				db
					.select({ total: count() })
					.from(playlist)
					.where(eq(playlist.isGenerated, true)),
				db
					.select({ total: count() })
					.from(playlist)
					.where(
						and(eq(playlist.isGenerated, true), isNotNull(playlist.exportedAt)),
					),
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
				totalPipelineRuns: pipelineRunRows[0]?.total ?? 0,
				completedPipelineRuns: completedPipelineRunRows[0]?.total ?? 0,
				totalPlaylistsGenerated: generatedPlaylistRows[0]?.total ?? 0,
				playlistsExportedToSpotify: exportedPlaylistRows[0]?.total ?? 0,
			};
		}),
};
