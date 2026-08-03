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
	playlistTracksInput,
	playlistTracksOutputSchema,
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
import { ORPCError } from "@orpc/server";
import { and, asc, desc, eq, gt, ilike, lt, or } from "drizzle-orm";
import { z } from "zod";
import { approvedProcedure } from "../../procedures";

/** Splits a limit+1-fetched page into the page itself and whether there's more. */
function splitPage<T>(
	rows: T[],
	limit: number,
): { page: T[]; hasMore: boolean } {
	const hasMore = rows.length > limit;
	return { page: hasMore ? rows.slice(0, limit) : rows, hasMore };
}

export const playlistsRouter = {
	list: approvedProcedure
		.input(playlistListInput)
		.output(playlistListOutputSchema)
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;
			const searchCondition = input.search
				? ilike(playlist.name, `%${input.search}%`)
				: undefined;

			if (input.sort === "recent") {
				const rows = await db
					.select()
					.from(playlist)
					.where(
						and(
							eq(playlist.userId, userId),
							input.cursor != null ? lt(playlist.id, input.cursor) : undefined,
							searchCondition,
						),
					)
					.orderBy(desc(playlist.id))
					.limit(input.limit + 1);

				const { page, hasMore } = splitPage(rows, input.limit);
				const nextCursor = hasMore ? (page[page.length - 1]?.id ?? null) : null;

				return { items: page, nextCursor };
			}

			// Non-"recent" sorts paginate by offset rather than a value-based
			// cursor — simpler than a composite tuple cursor, and correct as
			// long as the list isn't being edited while the user scrolls
			// (acceptable ceiling for a playlist library of realistic size).
			const offset = input.cursor ?? 0;
			const orderBy =
				input.sort === "name"
					? [asc(playlist.name), asc(playlist.id)]
					: [desc(playlist.trackCount), asc(playlist.id)];

			const rows = await db
				.select()
				.from(playlist)
				.where(and(eq(playlist.userId, userId), searchCondition))
				.orderBy(...orderBy)
				.limit(input.limit + 1)
				.offset(offset);

			const { page, hasMore } = splitPage(rows, input.limit);
			const nextCursor = hasMore ? offset + input.limit : null;

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

			const [clusterRow] = await db
				.select({ metadata: cluster.metadata })
				.from(playlistClusters)
				.innerJoin(cluster, eq(cluster.id, playlistClusters.clusterId))
				.where(eq(playlistClusters.playlistId, input.id))
				.limit(1);

			const meta = clusterRow?.metadata as ClusterMeta | null;

			return {
				...result,
				mood: meta?.dominantMood ?? null,
				energy: meta?.dominantEnergy ?? null,
				themes: meta?.topThemes ?? null,
			};
		}),

	getTracks: approvedProcedure
		.input(playlistTracksInput)
		.output(playlistTracksOutputSchema)
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;

			const [owned] = await db
				.select({ id: playlist.id })
				.from(playlist)
				.where(
					and(eq(playlist.id, input.playlistId), eq(playlist.userId, userId)),
				);
			if (!owned) {
				throw new ORPCError("NOT_FOUND", { message: "Playlist not found" });
			}

			const columns = {
				id: track.id,
				name: track.name,
				artistNames: track.artistNames,
				albumName: track.albumName,
				albumImageUrl: track.albumImageUrl,
				durationMs: track.durationMs,
				llmMood: track.llmMood,
				llmTags: track.llmTags,
				position: playlistTracks.position,
			};
			const searchCondition = input.search
				? or(
						ilike(track.name, `%${input.search}%`),
						ilike(track.artistNames, `%${input.search}%`),
					)
				: undefined;

			if (input.sort === "default") {
				const rows = await db
					.select(columns)
					.from(playlistTracks)
					.innerJoin(track, eq(track.id, playlistTracks.trackId))
					.where(
						and(
							eq(playlistTracks.playlistId, input.playlistId),
							input.cursor != null
								? gt(playlistTracks.position, input.cursor)
								: undefined,
							searchCondition,
						),
					)
					.orderBy(playlistTracks.position)
					.limit(input.limit + 1);

				const { page, hasMore } = splitPage(rows, input.limit);
				const nextCursor = hasMore
					? (page[page.length - 1]?.position ?? null)
					: null;

				return { items: page, nextCursor };
			}

			// Same offset-based approach as the playlist list's non-default
			// sorts — see the comment there for why this trade-off is fine here.
			const offset = input.cursor ?? 0;
			const orderBy =
				input.sort === "name"
					? [asc(track.name), asc(playlistTracks.position)]
					: [desc(track.durationMs), asc(playlistTracks.position)];

			const rows = await db
				.select(columns)
				.from(playlistTracks)
				.innerJoin(track, eq(track.id, playlistTracks.trackId))
				.where(
					and(eq(playlistTracks.playlistId, input.playlistId), searchCondition),
				)
				.orderBy(...orderBy)
				.limit(input.limit + 1)
				.offset(offset);

			const { page, hasMore } = splitPage(rows, input.limit);
			const nextCursor = hasMore ? offset + input.limit : null;

			return { items: page, nextCursor };
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
