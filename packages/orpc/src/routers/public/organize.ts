import { z } from "zod";

import type { Context } from "../../context";
import { publicProcedure } from "../../index";

import { db } from "@harmonia/db";
import {
	type PipelineProgress,
	pipelineRun,
} from "@harmonia/db/schema/pipeline-run";
import { env } from "@harmonia/env/server";
import { logger } from "@harmonia/logger";
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";

import type {
	ClassifyProgress,
	ClusterProgress,
	EmbedProgress,
	GenerateProgress,
	LyricsProgress,
	SyncProgress,
} from "@harmonia/common";

type SyncFn = (
	userId: string,
	onProgress?: (progress: SyncProgress) => Promise<void>,
) => Promise<SyncProgress>;

type LyricsFn = (
	userId: string,
	onProgress?: (progress: LyricsProgress) => Promise<void>,
) => Promise<LyricsProgress>;

type ClassifyFn = (
	userId: string,
	onProgress?: (progress: ClassifyProgress) => Promise<void>,
) => Promise<ClassifyProgress>;

type EmbedFn = (
	userId: string,
	onProgress?: (progress: EmbedProgress) => Promise<void>,
) => Promise<EmbedProgress>;

type ClusterFn = (
	userId: string,
	onProgress?: (progress: ClusterProgress) => Promise<void>,
) => Promise<ClusterProgress>;

type GenerateClusterMetaFn = (userId: string) => Promise<number>;

type GeneratePlaylistsFn = (
	userId: string,
	onProgress?: (progress: GenerateProgress) => Promise<void>,
) => Promise<GenerateProgress>;

type MatchTracksFn = (userId: string) => Promise<number>;

export type OrganizeDeps = {
	syncLikedTracks: SyncFn;
	fetchLyricsForPendingTracks: LyricsFn;
	classifyTracksBatch: ClassifyFn;
	embedTracksBatch: EmbedFn;
	runClustering: ClusterFn;
	generateClusterMetadata: GenerateClusterMetaFn;
	generatePlaylists: GeneratePlaylistsFn;
	matchNewTracksToPlaylists: MatchTracksFn;
};

async function updateRun(
	runId: number,
	data: {
		status?: string;
		currentStage?: string | null;
		progress?: PipelineProgress;
		error?: string;
		completedAt?: Date;
	},
) {
	await db.update(pipelineRun).set(data).where(eq(pipelineRun.id, runId));
}

export function createOrganizeRouter({
	syncLikedTracks,
	fetchLyricsForPendingTracks,
	classifyTracksBatch,
	embedTracksBatch,
	runClustering,
	generateClusterMetadata,
	generatePlaylists,
	matchNewTracksToPlaylists,
}: OrganizeDeps) {
	return {
		run: publicProcedure
			.meta({
				openapi: {
					method: "POST",
					path: "/organize/run",
					summary: "Run full organize pipeline",
					description:
						"Syncs Spotify, fetches lyrics, classifies with AI, generates embeddings, clusters tracks, and generates playlists. Requires auth or X-Organize-Secret header.",
					tags: ["organize"],
				},
			})
			.input(
				z.object({
					userId: z.string().optional(),
				}),
			)
			.handler(async ({ input, context }) => {
				logger.info({ input }, "organize.run invoked");

				const { userId } = await resolveUserId(input.userId, context);

				const [run] = await db
					.insert(pipelineRun)
					.values({
						userId,
						status: "running",
						currentStage: "sync",
						startedAt: new Date(),
					})
					.returning({ id: pipelineRun.id });

				if (!run) {
					throw new ORPCError("INTERNAL_SERVER_ERROR", {
						message: "Failed to create pipeline run",
					});
				}

				const runId = run.id;
				const progress: PipelineProgress = {};

				try {
					await updateRun(runId, { currentStage: "sync" });
					const syncResult = await syncLikedTracks(userId, async (p) => {
						progress.sync = p;
						await updateRun(runId, { progress });
					});
					progress.sync = syncResult;
					await updateRun(runId, { progress });

					await updateRun(runId, { currentStage: "lyrics" });
					const lyricsResult = await fetchLyricsForPendingTracks(
						userId,
						async (p) => {
							progress.lyrics = p;
							await updateRun(runId, { progress });
						},
					);
					progress.lyrics = lyricsResult;
					await updateRun(runId, { progress });

					await updateRun(runId, { currentStage: "classify" });
					const classifyResult = await classifyTracksBatch(
						userId,
						async (p) => {
							progress.classify = p;
							await updateRun(runId, { progress });
						},
					);
					progress.classify = classifyResult;
					await updateRun(runId, { progress });

					await updateRun(runId, { currentStage: "embed" });
					const embedResult = await embedTracksBatch(userId, async (p) => {
						progress.embed = p;
						await updateRun(runId, { progress });
					});
					progress.embed = embedResult;
					await updateRun(runId, { progress });

					await updateRun(runId, { currentStage: "cluster" });
					const clusterResult = await runClustering(userId, async (p) => {
						progress.cluster = p;
						await updateRun(runId, { progress });
					});
					progress.cluster = clusterResult;
					await updateRun(runId, { progress });

					await updateRun(runId, { currentStage: "generate" });
					await generateClusterMetadata(userId);
					const generateResult = await generatePlaylists(userId, async (p) => {
						progress.generate = p;
						await updateRun(runId, { progress });
					});
					progress.generate = generateResult;
					await updateRun(runId, { progress });

					await matchNewTracksToPlaylists(userId);

					await updateRun(runId, {
						status: "completed",
						currentStage: null,
						progress,
						completedAt: new Date(),
					});

					logger.info(
						{ userId, runId },
						"Organize pipeline completed successfully",
					);

					return { success: true, userId, runId };
				} catch (err: unknown) {
					const error = err instanceof Error ? err : new Error(String(err));
					const cause =
						error.cause ??
						(err &&
							typeof err === "object" &&
							"cause" in err &&
							(err as { cause?: unknown }).cause);
					const causeMessage =
						cause instanceof Error
							? cause.message
							: cause != null
								? String(cause)
								: undefined;
					const safePayload = {
						message: error.message,
						stack: error.stack,
						...(causeMessage !== undefined && { causeMessage }),
					};
					logger.error(safePayload, "Organize pipeline failed");

					await updateRun(runId, {
						status: "failed",
						error: error.message,
						completedAt: new Date(),
					});

					throw err;
				}
			}),
	};
}

async function resolveUserId(
	inputUserId: string | undefined,
	context: Context,
): Promise<{ userId: string }> {
	const cronSecret = context.headers?.get("X-Organize-Secret");
	const allowedByCron = env.CRON_SECRET && cronSecret === env.CRON_SECRET;
	const allowedByAuth = context.session?.user?.id;

	if (!allowedByCron && !allowedByAuth) {
		logger.warn(
			{
				hasSession: !!context.session,
				hasCronHeader: !!cronSecret,
			},
			"Unauthorized organize.run attempt",
		);

		throw new ORPCError("UNAUTHORIZED");
	}

	const userId = allowedByAuth ?? inputUserId;
	if (!userId) {
		logger.warn(
			{ inputUserId },
			"userId required for cron organize.run but was not provided",
		);

		throw new ORPCError("BAD_REQUEST", { message: "userId required for cron" });
	}

	return { userId };
}
