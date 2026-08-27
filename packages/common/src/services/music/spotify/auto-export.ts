import { db } from "@sonaraem/db";
import { playlist } from "@sonaraem/db/schema/playlist";
import { logger } from "@sonaraem/logger";
import { and, eq, inArray, isNotNull } from "drizzle-orm";

import { exportPlaylistToSpotify } from "./export";

export type AutoExportResult = {
	exported: number;
	failed: number;
};

/** Auto-syncs only playlists already exported at least once with autoSyncEnabled still on (#166); never creates a new Spotify playlist. */
export async function autoExportUpdatedPlaylists(
	userId: string,
	touchedPlaylistIds: readonly number[],
): Promise<AutoExportResult> {
	if (touchedPlaylistIds.length === 0) {
		return { exported: 0, failed: 0 };
	}

	const alreadyExported = await db
		.select({ id: playlist.id })
		.from(playlist)
		.where(
			and(
				inArray(playlist.id, [...touchedPlaylistIds]),
				isNotNull(playlist.spotifyPlaylistId),
				eq(playlist.autoSyncEnabled, true),
			),
		);

	let exported = 0;
	let failed = 0;

	for (const { id } of alreadyExported) {
		try {
			const result = await exportPlaylistToSpotify(userId, id);
			if (result) {
				exported++;
			} else {
				failed++;
			}
		} catch (err) {
			logger.error(
				{
					userId,
					playlistId: id,
					error: err instanceof Error ? err.message : String(err),
				},
				"Auto-export to Spotify failed for playlist",
			);
			failed++;
		}
	}

	logger.info(
		{ userId, exported, failed, candidates: touchedPlaylistIds.length },
		"Completed automatic Spotify export for updated playlists",
	);

	return { exported, failed };
}
