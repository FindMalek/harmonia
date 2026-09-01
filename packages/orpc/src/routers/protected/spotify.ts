import { eventIterator, ORPCError } from "@orpc/server";
import { getSpotifyLibraryStats } from "@sonaraem/common";
import {
	emptyInput,
	type SpotifyLibraryStats,
	spotifyLibraryStatsSchema,
	syncProgressEventSchema,
} from "@sonaraem/common/schemas";
import { syncUserLibraryTask } from "@sonaraem/common/trigger/tasks/spotify/sync-user-library";
import type { SyncPhase, SyncProgress } from "@sonaraem/common/types";
import { db } from "@sonaraem/db";
import { user } from "@sonaraem/db/schema/auth";
import { runs } from "@trigger.dev/sdk";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { approvedProcedure } from "../../procedures";

const TERMINAL_FAILURE_STATUSES = new Set([
	"CANCELED",
	"FAILED",
	"CRASHED",
	"SYSTEM_FAILURE",
	"EXPIRED",
	"TIMED_OUT",
]);

export const spotifyRouter = {
	libraryStats: approvedProcedure
		.input(emptyInput)
		.output(spotifyLibraryStatsSchema)
		.handler(async ({ context }) => {
			const userId = context.session.user.id;
			return getSpotifyLibraryStats(userId);
		}),

	streamSyncLibrary: approvedProcedure
		.input(emptyInput)
		.output(eventIterator(syncProgressEventSchema))
		.handler(async function* ({ context }) {
			const userId = context.session.user.id;

			// Triggers the sync on Trigger.dev's infra instead of running it
			// inline here — this handler just relays the run's realtime
			// metadata/status, so it stays CPU-idle (I/O wait) for the sync's
			// full duration rather than CPU-active (#295).
			const handle = await syncUserLibraryTask.trigger({ userId });

			try {
				for await (const run of runs.subscribeToRun(handle)) {
					const progress = run.metadata?.progress as SyncProgress | undefined;

					if (progress) {
						yield {
							event: "progress",
							progress: {
								phase: (progress.phase ?? "liked") as SyncPhase,
								phasesCompleted: progress.phasesCompleted ?? 0,
								percent: progress.percent ?? 0,
								done: progress.done ?? false,
								total: progress.total ?? 0,
							},
						};
					}

					if (run.status === "COMPLETED") {
						const output = run.output as
							| (SyncProgress & { stats?: SpotifyLibraryStats })
							| undefined;
						yield { event: "completed", stats: output?.stats };
						return;
					}

					if (TERMINAL_FAILURE_STATUSES.has(run.status)) {
						yield {
							event: "failed",
							error: `Sync ${run.status.toLowerCase()}`,
						};
						return;
					}
				}
			} catch (err) {
				yield {
					event: "failed",
					error: err instanceof Error ? err.message : String(err),
				};
			}
		}),

	syncLibrary: approvedProcedure
		.input(emptyInput)
		.output(
			z.object({
				total: z.number(),
				done: z.boolean(),
				stats: spotifyLibraryStatsSchema.optional(),
			}),
		)
		.handler(async ({ context }) => {
			const userId = context.session.user.id;

			const run = await syncUserLibraryTask.triggerAndWait({ userId });
			if (!run.ok) {
				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message:
						run.error instanceof Error ? run.error.message : String(run.error),
				});
			}

			return run.output;
		}),

	finalizeOnboarding: approvedProcedure
		.input(emptyInput)
		.output(z.object({ success: z.literal(true) }))
		.handler(async ({ context }) => {
			const userId = context.session.user.id;
			await db
				.update(user)
				.set({ hasCompletedOnboarding: true })
				.where(eq(user.id, userId));
			return { success: true } as const;
		}),
};
