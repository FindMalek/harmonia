import {
	emptyInput,
	playlistExportAllOutputSchema,
	playlistExportInput,
	playlistExportOutputSchema,
	playlistGetByIdInput,
	playlistGetByIdOutputSchema,
	playlistListItemSchema,
	playlistUpdateInput,
	playlistUpdateOutputSchema,
} from "@harmonia/common/schemas";
import { db } from "@harmonia/db";
import { playlist, playlistTracks } from "@harmonia/db/schema/playlist";
import { track } from "@harmonia/db/schema/track";
import { exportAllPlaylists, exportPlaylistToSpotify } from "@harmonia/common";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "../../procedures";

export const playlistsRouter = {
	list: protectedProcedure
		.input(emptyInput)
		.output(z.array(playlistListItemSchema))
		.handler(async ({ context }) => {
			const userId = context.session.user.id;

			const playlists = await db
				.select()
				.from(playlist)
				.where(eq(playlist.userId, userId))
				.orderBy(desc(playlist.createdAt));

			return playlists;
		}),

	getById: protectedProcedure
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
					durationMs: track.durationMs,
					llmMood: track.llmMood,
					llmTags: track.llmTags,
					position: playlistTracks.position,
				})
				.from(playlistTracks)
				.innerJoin(track, eq(track.id, playlistTracks.trackId))
				.where(eq(playlistTracks.playlistId, input.id))
				.orderBy(playlistTracks.position);

			return {
				...result,
				tracks,
			};
		}),

	update: protectedProcedure
		.input(playlistUpdateInput)
		.output(z.union([playlistUpdateOutputSchema, z.null()]))
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;

			const updates: Record<string, unknown> = {};
			if (input.name !== undefined) updates.name = input.name;
			if (input.description !== undefined)
				updates.description = input.description;

			if (Object.keys(updates).length === 0) return null;

			const [updated] = await db
				.update(playlist)
				.set(updates)
				.where(and(eq(playlist.id, input.id), eq(playlist.userId, userId)))
				.returning();

			return updated ?? null;
		}),

	export: protectedProcedure
		.input(playlistExportInput)
		.output(z.union([playlistExportOutputSchema, z.null()]))
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;
			const result = await exportPlaylistToSpotify(userId, input.id);
			return result;
		}),

	exportAll: protectedProcedure
		.input(emptyInput)
		.output(playlistExportAllOutputSchema)
		.handler(async ({ context }) => {
			const userId = context.session.user.id;
			const result = await exportAllPlaylists(userId);
			return result;
		}),
};
