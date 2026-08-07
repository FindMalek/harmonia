import {
	emptyInput,
	pipelineClearAnalysisOutputSchema,
	pipelineGetByIdInput,
	pipelineGetByIdOutputSchema,
	pipelineHeartbeatInput,
	pipelineHeartbeatOutputSchema,
	pipelineRunListItemSchema,
	pipelineStatsOutputSchema,
	pipelineStatusEventSchema,
	pipelineStreamStatusInput,
} from "@harmonia/common/schemas";
import { db } from "@harmonia/db";
import { cluster } from "@harmonia/db/schema/cluster";
import { pipelineRun } from "@harmonia/db/schema/pipeline-run";
import { playlist } from "@harmonia/db/schema/playlist";
import { track, userTracks } from "@harmonia/db/schema/track";
import { eventIterator } from "@orpc/server";
import { and, count, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { approvedProcedure } from "../../procedures";

const PIPELINE_STREAM_POLL_INTERVAL_MS = 2000;
const PIPELINE_STREAM_MAX_POLLS = 900;

export const pipelineRouter = {
	getAll: approvedProcedure
		.input(emptyInput)
		.output(z.array(pipelineRunListItemSchema))
		.handler(async ({ context }) => {
			const userId = context.session.user.id;
			const runs = await db
				.select()
				.from(pipelineRun)
				.where(eq(pipelineRun.userId, userId))
				.orderBy(desc(pipelineRun.createdAt))
				.limit(50);

			return runs;
		}),

	getById: approvedProcedure
		.input(pipelineGetByIdInput)
		.output(z.union([pipelineGetByIdOutputSchema, z.null()]))
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

	cancel: approvedProcedure
		.input(pipelineGetByIdInput)
		.output(z.object({ cancelled: z.boolean() }))
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;
			const updated = await db
				.update(pipelineRun)
				.set({
					status: "cancelled",
					completedAt: new Date(),
				})
				.where(
					and(
						eq(pipelineRun.id, input.id),
						eq(pipelineRun.userId, userId),
						eq(pipelineRun.status, "running"),
					),
				)
				.returning({ id: pipelineRun.id });

			return { cancelled: updated.length > 0 };
		}),

	heartbeat: approvedProcedure
		.input(pipelineHeartbeatInput)
		.output(pipelineHeartbeatOutputSchema)
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;
			const updated = await db
				.update(pipelineRun)
				.set({ lastClientSeenAt: new Date() })
				.where(
					and(
						eq(pipelineRun.id, input.id),
						eq(pipelineRun.userId, userId),
						eq(pipelineRun.status, "running"),
					),
				)
				.returning({ id: pipelineRun.id });

			return { ok: updated.length > 0 };
		}),

	streamStatus: approvedProcedure
		.input(pipelineStreamStatusInput)
		.output(eventIterator(pipelineStatusEventSchema))
		.handler(async function* ({ input, context, signal }) {
			const userId = context.session.user.id;
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
					if (run.status === "partial") {
						yield {
							event: "partial" as const,
							runId: run.id,
							progress: run.progress ?? {},
							error: run.error,
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
					if (run.status === "cancelled") {
						yield {
							event: "failed" as const,
							runId: run.id,
							progress: run.progress ?? {},
							error: "Cancelled by user",
							completedAt: run.completedAt,
						};
						return;
					}

					polls++;
					if (polls >= PIPELINE_STREAM_MAX_POLLS) {
						yield { event: "error" as const, message: "Polling timeout" };
						return;
					}

					await new Promise((resolve) =>
						setTimeout(resolve, PIPELINE_STREAM_POLL_INTERVAL_MS),
					);
				}
			} finally {
				// Client disconnected or stream ended
			}
		}),

	stats: approvedProcedure
		.input(emptyInput)
		.output(pipelineStatsOutputSchema)
		.handler(async ({ context }) => {
			const userId = context.session.user.id;

			const userTrackIds = db
				.select({ trackId: userTracks.trackId })
				.from(userTracks)
				.where(eq(userTracks.userId, userId));

			const [trackStats] = await db
				.select({
					total: count(),
					withLyrics: count(track.lyrics),
					classified: count(track.llmClassifiedAt),
					embedded: count(track.embeddingGeneratedAt),
				})
				.from(track)
				.where(inArray(track.id, userTrackIds));

			const [clusterStats] = await db
				.select({ total: count() })
				.from(cluster)
				.where(eq(cluster.userId, userId));

			const lyricsPending = await db
				.select({ count: count() })
				.from(track)
				.where(
					and(
						inArray(track.id, userTrackIds),
						or(eq(track.lyricsStatus, "pending"), isNull(track.lyricsStatus)),
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

	clearAnalysis: approvedProcedure
		.input(emptyInput)
		.output(pipelineClearAnalysisOutputSchema)
		.handler(async ({ context }) => {
			const userId = context.session.user.id;

			await db
				.delete(playlist)
				.where(
					and(eq(playlist.userId, userId), eq(playlist.isGenerated, true)),
				);

			await db.delete(cluster).where(eq(cluster.userId, userId));

			const userTrackIds = db
				.select({ trackId: userTracks.trackId })
				.from(userTracks)
				.where(eq(userTracks.userId, userId));

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
				.where(inArray(track.id, userTrackIds));

			return {
				cleared: true,
				tracksUpdated: result.rowCount ?? 0,
			};
		}),
};
