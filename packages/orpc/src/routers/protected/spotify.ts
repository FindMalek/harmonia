import { getSpotifyLibraryStats, syncLibraryTracks } from "@harmonia/common";
import {
	emptyInput,
	type SyncProgressEvent,
	spotifyLibraryStatsSchema,
	syncProgressEventSchema,
} from "@harmonia/common/schemas";
import type { SyncProgress } from "@harmonia/common/types";
import { db } from "@harmonia/db";
import { user } from "@harmonia/db/schema/auth";
import { eventIterator } from "@orpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { approvedProcedure } from "../../procedures";

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

			const queue: SyncProgressEvent[] = [];
			let resolveNext: (() => void) | null = null;
			const waitNext = () =>
				new Promise<void>((r) => {
					resolveNext = r;
				});

			const onProgress = async (p: SyncProgress) => {
				queue.push({
					event: "progress",
					progress: {
						phase: p.phase ?? "liked",
						phasesCompleted: p.phasesCompleted ?? 0,
						percent: p.percent ?? 0,
						done: p.done ?? false,
						total: p.total ?? 0,
					},
				});
				resolveNext?.();
			};

			const syncPromise = syncLibraryTracks(userId, onProgress);

			try {
				while (true) {
					while (queue.length > 0) {
						yield queue.shift()!;
					}

					const result = await Promise.race([
						syncPromise.then((r) => ({ done: true, result: r })),
						waitNext().then(() => ({ done: false, result: null })),
					]);

					if (result.done && result.result) {
						const { stats } = result.result;
						yield { event: "completed", stats };
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
			const result = await syncLibraryTracks(userId);
			return result;
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
