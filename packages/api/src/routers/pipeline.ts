import { z } from "zod";

import { db } from "@harmonia/db";
import { cluster } from "@harmonia/db/schema/cluster";
import { pipelineRun } from "@harmonia/db/schema/pipeline-run";
import { playlist } from "@harmonia/db/schema/playlist";
import { track } from "@harmonia/db/schema/track";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { protectedProcedure } from "../index";

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
