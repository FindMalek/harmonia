import { z } from "zod";

import { db } from "@harmonia/db";
import { clusterTracks } from "@harmonia/db/schema/cluster";
import { track } from "@harmonia/db/schema/track";
import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { protectedProcedure } from "../index";

export const tracksRouter = {
	list: protectedProcedure
		.input(
			z.object({
				page: z.number().default(1),
				pageSize: z.number().default(50),
				search: z.string().optional(),
				lyricsStatus: z.string().optional(),
				classified: z.boolean().optional(),
				embedded: z.boolean().optional(),
			}),
		)
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;
			const offset = (input.page - 1) * input.pageSize;

			const conditions = [eq(track.userId, userId)];

			if (input.search) {
				const searchCondition = or(
					ilike(track.name, `%${input.search}%`),
					ilike(track.artistNames, `%${input.search}%`),
				);
				if (searchCondition) conditions.push(searchCondition);
			}

			if (input.lyricsStatus) {
				conditions.push(eq(track.lyricsStatus, input.lyricsStatus));
			}

			if (input.classified === true) {
				conditions.push(sql`${track.llmClassifiedAt} IS NOT NULL`);
			} else if (input.classified === false) {
				conditions.push(sql`${track.llmClassifiedAt} IS NULL`);
			}

			if (input.embedded === true) {
				conditions.push(sql`${track.embeddingGeneratedAt} IS NOT NULL`);
			} else if (input.embedded === false) {
				conditions.push(sql`${track.embeddingGeneratedAt} IS NULL`);
			}

			const where = and(...conditions);

			const [totalResult] = await db
				.select({ count: count() })
				.from(track)
				.where(where);

			const tracks = await db
				.select({
					id: track.id,
					name: track.name,
					artistNames: track.artistNames,
					albumName: track.albumName,
					durationMs: track.durationMs,
					lyricsStatus: track.lyricsStatus,
					llmMood: track.llmMood,
					llmTags: track.llmTags,
					llmClassifiedAt: track.llmClassifiedAt,
					embeddingGeneratedAt: track.embeddingGeneratedAt,
					createdAt: track.createdAt,
				})
				.from(track)
				.where(where)
				.orderBy(desc(track.createdAt))
				.limit(input.pageSize)
				.offset(offset);

			return {
				tracks,
				total: totalResult?.count ?? 0,
				page: input.page,
				pageSize: input.pageSize,
			};
		}),

	getById: protectedProcedure
		.input(z.object({ id: z.string() }))
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;

			const [result] = await db
				.select()
				.from(track)
				.where(and(eq(track.id, input.id), eq(track.userId, userId)));

			if (!result) return null;

			const clusterAssignment = await db
				.select({ clusterId: clusterTracks.clusterId })
				.from(clusterTracks)
				.where(eq(clusterTracks.trackId, input.id))
				.limit(1);

			return {
				...result,
				embedding: undefined,
				clusterId: clusterAssignment[0]?.clusterId ?? null,
			};
		}),
};
