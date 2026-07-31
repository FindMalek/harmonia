import { exportAllPlaylists, exportPlaylistToSpotify } from "@harmonia/common";
import {
	emptyInput,
	playlistExportAllOutputSchema,
	playlistExportInput,
	playlistExportOutputSchema,
	playlistGetByIdInput,
	playlistGetByIdOutputSchema,
	playlistListInput,
	playlistListOutputSchema,
	playlistUpdateInput,
	playlistUpdateOutputSchema,
} from "@harmonia/common/schemas";
import { db } from "@harmonia/db";
import type { ClusterMeta } from "@harmonia/db/schema/cluster";
import { cluster } from "@harmonia/db/schema/cluster";
import {
	playlist,
	playlistClusters,
	playlistTracks,
} from "@harmonia/db/schema/playlist";
import { track } from "@harmonia/db/schema/track";
import { and, desc, eq, ilike, lt } from "drizzle-orm";
import { z } from "zod";
import { approvedProcedure } from "../../procedures";

export const playlistsRouter = {
	list: approvedProcedure
		.input(playlistListInput)
		.output(playlistListOutputSchema)
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;

			const items = await db
				.select()
				.from(playlist)
				.where(
					and(
						eq(playlist.userId, userId),
						input.cursor != null ? lt(playlist.id, input.cursor) : undefined,
						input.search
							? ilike(playlist.name, `%${input.search}%`)
							: undefined,
					),
				)
				.orderBy(desc(playlist.id))
				.limit(input.limit + 1);

			const hasMore = items.length > input.limit;
			const page = hasMore ? items.slice(0, input.limit) : items;
			const nextCursor = hasMore ? (page.at(-1)?.id ?? null) : null;

			return { items: page, nextCursor };
		}),

	getById: approvedProcedure
		.input(playlistGetByIdInput)
		.output(z.union([playlistGetByIdOutputSchema, z.null()]))
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;

			const [result] = await db
				.select()
				.from(playlist)
				.where(and(eq(playlist.id, input.id), eq(playlist.userId, userId)));

			if (!result) return null;

			const tracks = await db
				.select({
					id: track.id,
					name: track.name,
					artistNames: track.artistNames,
					albumName: track.albumName,
					albumImageUrl: track.albumImageUrl,
					durationMs: track.durationMs,
					llmMood: track.llmMood,
					llmTags: track.llmTags,
					position: playlistTracks.position,
				})
				.from(playlistTracks)
				.innerJoin(track, eq(track.id, playlistTracks.trackId))
				.where(eq(playlistTracks.playlistId, input.id))
				.orderBy(playlistTracks.position);

			const [clusterRow] = await db
				.select({ metadata: cluster.metadata })
				.from(playlistClusters)
				.innerJoin(cluster, eq(cluster.id, playlistClusters.clusterId))
				.where(eq(playlistClusters.playlistId, input.id))
				.limit(1);

			const meta = clusterRow?.metadata as ClusterMeta | null;

			return {
				...result,
				tracks,
				mood: meta?.dominantMood ?? null,
				energy: meta?.dominantEnergy ?? null,
				themes: meta?.topThemes ?? null,
			};
		}),

	update: approvedProcedure
		.input(playlistUpdateInput)
		.output(z.union([playlistUpdateOutputSchema, z.null()]))
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;

			const updates: {
				name?: string;
				description?: string;
				autoSyncEnabled?: boolean;
			} = {};
			if (input.name !== undefined) updates.name = input.name;
			if (input.description !== undefined)
				updates.description = input.description;
			if (input.autoSyncEnabled !== undefined)
				updates.autoSyncEnabled = input.autoSyncEnabled;

			if (Object.keys(updates).length === 0) return null;

			const [updated] = await db
				.update(playlist)
				.set(updates)
				.where(and(eq(playlist.id, input.id), eq(playlist.userId, userId)))
				.returning();

			return updated ?? null;
		}),

	export: approvedProcedure
		.input(playlistExportInput)
		.output(z.union([playlistExportOutputSchema, z.null()]))
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;
			const result = await exportPlaylistToSpotify(userId, input.id);
			return result;
		}),

	exportAll: approvedProcedure
		.input(emptyInput)
		.output(playlistExportAllOutputSchema)
		.handler(async ({ context }) => {
			const userId = context.session.user.id;
			const result = await exportAllPlaylists(userId);
			return result;
		}),
};
