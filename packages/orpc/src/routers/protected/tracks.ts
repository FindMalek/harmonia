import {
	trackGetByIdInput,
	trackGetByIdOutputSchema,
	tracksListInput,
	tracksListOutputSchema,
} from "@harmonia/common/schemas";
import { db } from "@harmonia/db";
import { clusterTracks } from "@harmonia/db/schema/cluster";
import { track, userTracks } from "@harmonia/db/schema/track";
import {
	and,
	count,
	desc,
	eq,
	ilike,
	inArray,
	isNotNull,
	isNull,
	or,
} from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "../../procedures";

export const tracksRouter = {
	list: protectedProcedure
		.input(tracksListInput)
		.output(tracksListOutputSchema)
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;
			const offset = (input.page - 1) * input.pageSize;

			const userTrackIds = db
				.select({ trackId: userTracks.trackId })
				.from(userTracks)
				.where(eq(userTracks.userId, userId));

			const conditions = [inArray(track.id, userTrackIds)];

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
				conditions.push(isNotNull(track.llmClassifiedAt));
			} else if (input.classified === false) {
				conditions.push(isNull(track.llmClassifiedAt));
			}

			if (input.embedded === true) {
				conditions.push(isNotNull(track.embeddingGeneratedAt));
			} else if (input.embedded === false) {
				conditions.push(isNull(track.embeddingGeneratedAt));
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
		.input(trackGetByIdInput)
		.output(z.union([trackGetByIdOutputSchema, z.null()]))
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;

			const userTrackIds = db
				.select({ trackId: userTracks.trackId })
				.from(userTracks)
				.where(eq(userTracks.userId, userId));

			const [result] = await db
				.select()
				.from(track)
				.where(and(eq(track.id, input.id), inArray(track.id, userTrackIds)));

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
