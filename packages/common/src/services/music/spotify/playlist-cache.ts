import type { SpotifyPlaylistTrackItem } from "@harmonia/common/schemas";
import { db } from "@harmonia/db";
import {
	userPlaylistSnapshotItemArtists,
	userPlaylistSnapshotItems,
	userPlaylistSnapshots,
} from "@harmonia/db/schema/spotify";
import { asc, and, eq } from "drizzle-orm";

/**
 * Returns cached playlist items if we have a matching snapshot. Returns null on cache miss.
 */
export async function getCachedPlaylistItems(
	userId: string,
	playlistId: string,
	snapshotId: string,
): Promise<SpotifyPlaylistTrackItem[] | null> {
	const [snapshot] = await db
		.select()
		.from(userPlaylistSnapshots)
		.where(
			and(
				eq(userPlaylistSnapshots.userId, userId),
				eq(userPlaylistSnapshots.playlistId, playlistId),
				eq(userPlaylistSnapshots.snapshotId, snapshotId),
			),
		)
		.limit(1);

	if (!snapshot) {
		return null;
	}

	const items = await db
		.select()
		.from(userPlaylistSnapshotItems)
		.where(
			and(
				eq(userPlaylistSnapshotItems.userId, userId),
				eq(userPlaylistSnapshotItems.playlistId, playlistId),
				eq(userPlaylistSnapshotItems.snapshotId, snapshotId),
			),
		)
		.orderBy(asc(userPlaylistSnapshotItems.position));

	const artistsRows = await db
		.select()
		.from(userPlaylistSnapshotItemArtists)
		.where(
			and(
				eq(userPlaylistSnapshotItemArtists.userId, userId),
				eq(userPlaylistSnapshotItemArtists.playlistId, playlistId),
			),
		)
		.orderBy(
			asc(userPlaylistSnapshotItemArtists.position),
			asc(userPlaylistSnapshotItemArtists.artistPosition),
		);

	const artistsByPosition = new Map<number, typeof artistsRows>();
	for (const a of artistsRows) {
		const arr = artistsByPosition.get(a.position) ?? [];
		arr.push(a);
		artistsByPosition.set(a.position, arr);
	}

	const result: SpotifyPlaylistTrackItem[] = items.map((item) => ({
		track: {
			id: item.trackId,
			name: item.trackName,
			uri: item.trackUri,
			duration_ms: item.durationMs,
			album: item.albumName
				? { id: item.albumId ?? undefined, name: item.albumName }
				: null,
			artists: (artistsByPosition.get(item.position) ?? []).map((a) => ({
				id: a.artistId ?? undefined,
				name: a.artistName,
			})),
		},
	}));

	return result;
}

/**
 * Stores playlist items in the cache. Deletes existing rows for (userId, playlistId) first.
 */
export async function setCachedPlaylistItems(
	userId: string,
	playlistId: string,
	snapshotId: string,
	items: SpotifyPlaylistTrackItem[],
): Promise<void> {
	await db.transaction(async (tx) => {
		await tx
			.delete(userPlaylistSnapshotItems)
			.where(
				and(
					eq(userPlaylistSnapshotItems.userId, userId),
					eq(userPlaylistSnapshotItems.playlistId, playlistId),
				),
			);

		await tx
			.delete(userPlaylistSnapshotItemArtists)
			.where(
				and(
					eq(userPlaylistSnapshotItemArtists.userId, userId),
					eq(userPlaylistSnapshotItemArtists.playlistId, playlistId),
				),
			);

		const itemRows = items
			.map((item, position) => {
				const t = item.track;
				if (!t?.id) return null;
				return {
					userId,
					playlistId,
					snapshotId,
					position,
					trackId: t.id,
					trackName: t.name,
					trackUri: t.uri ?? `spotify:track:${t.id}`,
					albumId: t.album?.id ?? null,
					albumName: t.album?.name ?? null,
					durationMs: t.duration_ms ?? null,
				};
			})
			.filter((r): r is NonNullable<typeof r> => r !== null);

		if (itemRows.length > 0) {
			await tx.insert(userPlaylistSnapshotItems).values(itemRows);
		}

		const artistRows: Array<{
			userId: string;
			playlistId: string;
			position: number;
			artistPosition: number;
			artistId: string | null;
			artistName: string;
		}> = [];

		for (let position = 0; position < items.length; position++) {
			const t = items[position]?.track;
			if (!t?.id) continue;
			for (
				let artistPosition = 0;
				artistPosition < (t.artists?.length ?? 0);
				artistPosition++
			) {
				const a = t.artists?.[artistPosition];
				if (!a?.name) continue;
				artistRows.push({
					userId,
					playlistId,
					position,
					artistPosition,
					artistId: a.id ?? null,
					artistName: a.name,
				});
			}
		}

		if (artistRows.length > 0) {
			await tx.insert(userPlaylistSnapshotItemArtists).values(artistRows);
		}
	});
}
