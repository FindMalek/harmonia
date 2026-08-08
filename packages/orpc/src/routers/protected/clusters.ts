import {
	clusterGetByIdInput,
	clusterGetByIdOutputSchema,
	clusterListItemSchema,
	emptyInput,
} from "@harmonia/common/schemas";
import { llmFieldsFromAnalysis } from "@harmonia/common/types";
import { db } from "@harmonia/db";
import { cluster, clusterTracks } from "@harmonia/db/schema/cluster";
import { track } from "@harmonia/db/schema/track";
import { trackAnalysis } from "@harmonia/db/schema/track-analysis";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { approvedProcedure } from "../../procedures";

export const clustersRouter = {
	list: approvedProcedure
		.input(emptyInput)
		.output(z.array(clusterListItemSchema))
		.handler(async ({ context }) => {
			const userId = context.session.user.id;

			const clusters = await db
				.select()
				.from(cluster)
				.where(eq(cluster.userId, userId))
				.orderBy(desc(cluster.createdAt));

			return clusters;
		}),

	getById: approvedProcedure
		.input(clusterGetByIdInput)
		.output(z.union([clusterGetByIdOutputSchema, z.null()]))
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;

			const [result] = await db
				.select()
				.from(cluster)
				.where(and(eq(cluster.id, input.id), eq(cluster.userId, userId)));

			if (!result) return null;

			const trackRows = await db
				.select({
					id: track.id,
					name: track.name,
					artistNames: track.artistNames,
					albumName: track.albumName,
					position: clusterTracks.position,
					mood: trackAnalysis.mood,
					secondaryMoods: trackAnalysis.secondaryMoods,
					themes: trackAnalysis.themes,
					topics: trackAnalysis.topics,
					vibe: trackAnalysis.vibe,
					vocalType: trackAnalysis.vocalType,
					energyLevel: trackAnalysis.energyLevel,
					language: trackAnalysis.language,
					era: trackAnalysis.era,
					classifiedAt: trackAnalysis.classifiedAt,
				})
				.from(clusterTracks)
				.innerJoin(track, eq(track.id, clusterTracks.trackId))
				.leftJoin(trackAnalysis, eq(trackAnalysis.trackId, track.id))
				.where(eq(clusterTracks.clusterId, input.id))
				.orderBy(clusterTracks.position);

			const tracks = trackRows.map(
				({
					mood,
					secondaryMoods,
					themes,
					topics,
					vibe,
					vocalType,
					energyLevel,
					language,
					era,
					classifiedAt,
					...rest
				}) => ({
					...rest,
					...llmFieldsFromAnalysis({
						mood,
						secondaryMoods,
						themes,
						topics,
						vibe,
						vocalType,
						energyLevel,
						language,
						era,
						classifiedAt,
					}),
				}),
			);

			return {
				...result,
				centroid: result.centroid ?? null,
				tracks,
			};
		}),
};
