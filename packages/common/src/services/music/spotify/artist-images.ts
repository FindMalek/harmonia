import { conflictValue, db } from "@harmonia/db";
import { artist } from "@harmonia/db/schema/artist";
import { track, userTracks } from "@harmonia/db/schema/track";
import { logger } from "@harmonia/logger";
import { eq, inArray } from "drizzle-orm";

import { fetchArtistsByIds, getUserSpotifyAccessToken } from "./client";

// No fan-out/worker split needed here (unlike lyrics/classify/embed) — a
// batch of 50 artist IDs is a single Spotify request, so even a library with
// a couple thousand unique artists is a few dozen sequential calls.
export async function fetchAndCacheArtistImages(
	userId: string,
	pipelineRunId?: number,
): Promise<{ fetched: number }> {
	const userTrackRows = await db
		.select({ artistIds: track.artistIds })
		.from(userTracks)
		.innerJoin(track, eq(track.id, userTracks.trackId))
		.where(eq(userTracks.userId, userId));

	const allArtistIds = new Set<string>();
	for (const row of userTrackRows) {
		for (const id of row.artistIds ?? []) {
			if (id) allArtistIds.add(id);
		}
	}
	if (allArtistIds.size === 0) return { fetched: 0 };

	const cachedRows = await db
		.select({ id: artist.id })
		.from(artist)
		.where(inArray(artist.id, [...allArtistIds]));
	const cachedIds = new Set(cachedRows.map((r) => r.id));
	const missingIds = [...allArtistIds].filter((id) => !cachedIds.has(id));

	if (missingIds.length === 0) return { fetched: 0 };

	const accessToken = await getUserSpotifyAccessToken(userId);
	if (!accessToken) {
		logger.warn(
			{ userId },
			"No Spotify access token; skipping artist image fetch",
		);
		return { fetched: 0 };
	}

	const artists = await fetchArtistsByIds(accessToken, missingIds, {
		userId,
		pipelineRunId,
	});
	if (artists.length === 0) return { fetched: 0 };

	await db
		.insert(artist)
		.values(
			artists.map((a) => ({ id: a.id, name: a.name, imageUrl: a.imageUrl })),
		)
		.onConflictDoUpdate({
			target: artist.id,
			set: {
				name: conflictValue(artist.name),
				imageUrl: conflictValue(artist.imageUrl),
				fetchedAt: conflictValue(artist.fetchedAt),
			},
		});

	logger.info(
		{ userId, requested: missingIds.length, fetched: artists.length },
		"Cached artist images",
	);

	return { fetched: artists.length };
}
