import { z } from "zod";

import { db } from "@harmonia/db";
import { cluster, clusterTracks } from "@harmonia/db/schema/cluster";
import { track } from "@harmonia/db/schema/track";
import { and, desc, eq } from "drizzle-orm";
import { protectedProcedure } from "../index";

export const clustersRouter = {
	list: protectedProcedure.handler(async ({ context }) => {
		const userId = context.session.user.id;

		const clusters = await db
			.select()
			.from(cluster)
			.where(eq(cluster.userId, userId))
			.orderBy(desc(cluster.createdAt));

		return clusters;
	}),

	getById: protectedProcedure
		.input(z.object({ id: z.number() }))
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;

			const [result] = await db
				.select()
				.from(cluster)
				.where(and(eq(cluster.id, input.id), eq(cluster.userId, userId)));

			if (!result) return null;

			const tracks = await db
				.select({
					id: track.id,
					name: track.name,
					artistNames: track.artistNames,
					albumName: track.albumName,
					llmMood: track.llmMood,
					llmTags: track.llmTags,
					position: clusterTracks.position,
				})
				.from(clusterTracks)
				.innerJoin(track, eq(track.id, clusterTracks.trackId))
				.where(eq(clusterTracks.clusterId, input.id))
				.orderBy(clusterTracks.position);

			return {
				...result,
				centroid: undefined,
				tracks,
			};
		}),
};
