import {
	fetchAllUserPlaylists,
	getUserSpotifyAccessToken,
} from "@sonaraem/common";
import {
	trackGetByIdInput,
	trackGetByIdOutputSchema,
	tracksListInput,
	tracksListOutputSchema,
} from "@sonaraem/common/schemas";
import { llmFieldsFromAnalysis } from "@sonaraem/common/types";
import { db } from "@sonaraem/db";
import { artist } from "@sonaraem/db/schema/artist";
import { clusterTracks } from "@sonaraem/db/schema/cluster";
import { genreDomain } from "@sonaraem/db/schema/genre-domain";
import { playlist, playlistTracks } from "@sonaraem/db/schema/playlist";
import { userPlaylistSnapshotItems } from "@sonaraem/db/schema/spotify";
import { track, userTracks } from "@sonaraem/db/schema/track";
import { trackAnalysis } from "@sonaraem/db/schema/track-analysis";
import { logger } from "@sonaraem/logger";
import {
	and,
	asc,
	count,
	desc,
	eq,
	ilike,
	inArray,
	isNotNull,
	isNull,
	notInArray,
	or,
} from "drizzle-orm";
import { z } from "zod";
import { approvedProcedure } from "../../procedures";

export const tracksRouter = {
	list: approvedProcedure
		.input(tracksListInput)
		.output(tracksListOutputSchema)
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;
			const offset = (input.page - 1) * input.pageSize;

			const userTrackIds = db
				.select({ trackId: userTracks.trackId })
				.from(userTracks)
				.where(eq(userTracks.userId, userId));

			const analyzedTrackIds = db
				.select({ trackId: trackAnalysis.trackId })
				.from(trackAnalysis);

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
				conditions.push(inArray(track.id, analyzedTrackIds));
			} else if (input.classified === false) {
				conditions.push(notInArray(track.id, analyzedTrackIds));
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

			const rows = await db
				.select({
					id: track.id,
					name: track.name,
					artistNames: track.artistNames,
					artistIds: track.artistIds,
					albumName: track.albumName,
					albumId: track.albumId,
					albumImageUrl: track.albumImageUrl,
					releaseDate: track.releaseDate,
					explicit: track.explicit,
					popularity: track.popularity,
					durationMs: track.durationMs,
					lyricsStatus: track.lyricsStatus,
					embeddingGeneratedAt: track.embeddingGeneratedAt,
					createdAt: track.createdAt,
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
				.from(track)
				.leftJoin(trackAnalysis, eq(trackAnalysis.trackId, track.id))
				.where(where)
				.orderBy(
					...(input.sort === "album"
						? [asc(track.albumName), asc(track.id)]
						: [desc(track.createdAt)]),
				)
				.limit(input.pageSize)
				.offset(offset);

			const tracks = rows.map(
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
				tracks,
				total: totalResult?.count ?? 0,
				page: input.page,
				pageSize: input.pageSize,
			};
		}),

	getById: approvedProcedure
		.input(trackGetByIdInput)
		.output(z.union([trackGetByIdOutputSchema, z.null()]))
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;

			const userTrackIds = db
				.select({ trackId: userTracks.trackId })
				.from(userTracks)
				.where(eq(userTracks.userId, userId));

			const [result] = await db
				.select({
					track,
					likedAt: userTracks.addedAt,
					genreDomainName: genreDomain.name,
					analysis: {
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
					},
				})
				.from(track)
				.innerJoin(
					userTracks,
					and(eq(userTracks.trackId, track.id), eq(userTracks.userId, userId)),
				)
				.leftJoin(genreDomain, eq(genreDomain.id, track.genreDomainId))
				.leftJoin(trackAnalysis, eq(trackAnalysis.trackId, track.id))
				.where(and(eq(track.id, input.id), inArray(track.id, userTrackIds)));

			if (!result) return null;

			const artistIds = (result.track.artistIds ?? []).filter(
				(id): id is string => Boolean(id),
			);
			const artistImageRows =
				artistIds.length > 0
					? await db
							.select({ id: artist.id, imageUrl: artist.imageUrl })
							.from(artist)
							.where(inArray(artist.id, artistIds))
					: [];
			const imageUrlByArtistId = new Map(
				artistImageRows.map((a) => [a.id, a.imageUrl]),
			);
			const artistImageUrls = (result.track.artistIds ?? []).map((id) =>
				id ? (imageUrlByArtistId.get(id) ?? null) : null,
			);

			const clusterAssignment = await db
				.select({ clusterId: clusterTracks.clusterId })
				.from(clusterTracks)
				.where(eq(clusterTracks.trackId, input.id))
				.limit(1);

			const sonaraemPlaylists = await db
				.select({ id: playlist.id, name: playlist.name })
				.from(playlistTracks)
				.innerJoin(playlist, eq(playlist.id, playlistTracks.playlistId))
				.where(
					and(
						eq(playlistTracks.trackId, input.id),
						eq(playlist.userId, userId),
					),
				);

			// userPlaylistSnapshotItems only ever holds each playlist's latest
			// snapshot (setCachedPlaylistItems deletes prior rows before
			// inserting), so this is already "current Spotify state," no
			// snapshot-id filtering needed.
			const spotifyPlaylistRows = await db
				.select({ playlistId: userPlaylistSnapshotItems.playlistId })
				.from(userPlaylistSnapshotItems)
				.where(
					and(
						eq(userPlaylistSnapshotItems.userId, userId),
						eq(userPlaylistSnapshotItems.trackId, input.id),
					),
				);
			const spotifyPlaylistIds = new Set(
				spotifyPlaylistRows.map((r) => r.playlistId),
			);

			let spotifyPlaylists: Array<{ id: string; name: string }> = [];
			if (spotifyPlaylistIds.size > 0) {
				try {
					const accessToken = await getUserSpotifyAccessToken(userId);
					if (accessToken) {
						const allPlaylists = await fetchAllUserPlaylists(accessToken, {
							context: { userId },
						});
						spotifyPlaylists = allPlaylists
							.filter((p) => spotifyPlaylistIds.has(p.id))
							.map((p) => ({ id: p.id, name: p.name }));
					}
				} catch (err) {
					// Non-fatal: the rest of the track detail page is still useful
					// without the Spotify playlist names.
					logger.warn(
						{
							userId,
							trackId: input.id,
							error: err instanceof Error ? err.message : String(err),
						},
						"Failed to resolve Spotify playlist names for track detail",
					);
				}
			}

			return {
				...result.track,
				...llmFieldsFromAnalysis(result.analysis),
				embedding: undefined,
				clusterId: clusterAssignment[0]?.clusterId ?? null,
				genreDomainName: result.genreDomainName,
				likedAt: result.likedAt,
				sonaraemPlaylists,
				spotifyPlaylists,
				artistImageUrls,
			};
		}),
};
