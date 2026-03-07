import { z } from "zod";

import { eventIterator } from "@orpc/server";
import { db } from "@harmonia/db";
import { cluster } from "@harmonia/db/schema/cluster";
import { pipelineRun } from "@harmonia/db/schema/pipeline-run";
import { playlist } from "@harmonia/db/schema/playlist";
import { track } from "@harmonia/db/schema/track";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { protectedProcedure } from "../../procedures";

const pipelineStatusEvent = z.discriminatedUnion("event", [
	z.object({
		event: z.literal("progress"),
		runId: z.number(),
		status: z.string(),
		currentStage: z.string().nullable(),
		progress: z.unknown(),
		startedAt: z.date().nullable(),
	}),
	z.object({
		event: z.literal("completed"),
		runId: z.number(),
		progress: z.unknown(),
		completedAt: z.date().nullable(),
	}),
	z.object({
		event: z.literal("failed"),
		runId: z.number(),
		progress: z.unknown(),
		error: z.string().nullable(),
		completedAt: z.date().nullable(),
	}),
	z.object({
		event: z.literal("error"),
		message: z.string(),
	}),
]);

export const pipelineRouter = {
	getAll: protectedProcedure.handler(async ({ context }) => {
		const userId = context.session.user.id;
		const runs = await db
			.select()
			.from(pipelineRun)
			.where(eq(pipelineRun.userId, userId))
			.orderBy(desc(pipelineRun.createdAt))
			.limit(50);

		return runs;
	}),

	getById: protectedProcedure
		.input(z.object({ id: z.number() }))
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;
			const [run] = await db
				.select()
				.from(pipelineRun)
				.where(
					and(eq(pipelineRun.id, input.id), eq(pipelineRun.userId, userId)),
				);

			return run ?? null;
		}),

	streamStatus: protectedProcedure
		.input(z.object({ id: z.number() }))
		.output(eventIterator(pipelineStatusEvent))
		.handler(async function* ({ input, context, signal }) {
			const userId = context.session.user.id;
			const POLL_INTERVAL = 2000;
			const MAX_POLLS = 900;
			let polls = 0;

			try {
				while (!signal?.aborted) {
					const [run] = await db
						.select()
						.from(pipelineRun)
						.where(
							and(eq(pipelineRun.id, input.id), eq(pipelineRun.userId, userId)),
						);

					if (!run) {
						yield {
							event: "error" as const,
							message: "Pipeline run not found",
						};
						return;
					}

					yield {
						event: "progress" as const,
						runId: run.id,
						status: run.status,
						currentStage: run.currentStage,
						progress: run.progress ?? {},
						startedAt: run.startedAt,
					};

					if (run.status === "completed") {
						yield {
							event: "completed" as const,
							runId: run.id,
							progress: run.progress ?? {},
							completedAt: run.completedAt,
						};
						return;
					}
					if (run.status === "failed") {
						yield {
							event: "failed" as const,
							runId: run.id,
							progress: run.progress ?? {},
							error: run.error,
							completedAt: run.completedAt,
						};
						return;
					}

					polls++;
					if (polls >= MAX_POLLS) {
						yield { event: "error" as const, message: "Polling timeout" };
						return;
					}

					await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
				}
			} finally {
				// Client disconnected or stream ended
			}
		}),

	stats: protectedProcedure.handler(async ({ context }) => {
		const userId = context.session.user.id;

		const [trackStats] = await db
			.select({
				total: count(),
				withLyrics: count(track.lyrics),
				classified: count(track.llmClassifiedAt),
				embedded: count(track.embeddingGeneratedAt),
			})
			.from(track)
			.where(eq(track.userId, userId));

		const [clusterStats] = await db
			.select({ total: count() })
			.from(cluster)
			.where(eq(cluster.userId, userId));

		const lyricsPending = await db
			.select({ count: count() })
			.from(track)
			.where(
				and(
					eq(track.userId, userId),
					sql`(${track.lyricsStatus} = 'pending' OR ${track.lyricsStatus} IS NULL)`,
				),
			);

		return {
			tracks: {
				total: trackStats?.total ?? 0,
				withLyrics: trackStats?.withLyrics ?? 0,
				classified: trackStats?.classified ?? 0,
				embedded: trackStats?.embedded ?? 0,
				lyricsPending: lyricsPending[0]?.count ?? 0,
			},
			clusters: clusterStats?.total ?? 0,
		};
	}),

	clearAnalysis: protectedProcedure.handler(async ({ context }) => {
		const userId = context.session.user.id;

		await db
			.delete(playlist)
			.where(and(eq(playlist.userId, userId), eq(playlist.isGenerated, true)));

		await db.delete(cluster).where(eq(cluster.userId, userId));

		const result = await db
			.update(track)
			.set({
				llmMood: null,
				llmTags: null,
				llmClassifiedAt: null,
				genreDomainId: null,
				domainAssignedAt: null,
				embedding: null,
				embeddingGeneratedAt: null,
				embeddingInput: null,
				analysisSnapshot: null,
			})
			.where(eq(track.userId, userId));

		return {
			cleared: true,
			tracksUpdated: result.rowCount ?? 0,
		};
	}),
};
