import { db } from "@harmonia/db";
import { playlist } from "@harmonia/db/schema/playlist";
import { logger } from "@harmonia/logger";
import { and, eq, inArray, isNotNull } from "drizzle-orm";

import { exportPlaylistToSpotify } from "./export";

export type AutoExportResult = {
	exported: number;
	failed: number;
};

/**
 * Pushes this run's playlist changes to Spotify automatically — but ONLY for
 * playlists the user has already manually exported at least once
 * (`spotifyPlaylistId` set) AND that haven't been switched to manual sync
 * (`autoSyncEnabled`, #166). A playlist the user has never exported is left
 * database-only; exporting is what opts a playlist into ongoing automatic
 * updates, not something this pipeline decides on its own. Never creates a
 * new Spotify playlist — `exportPlaylistToSpotify` only takes the
 * update-in-place branch here, by construction (only already-exported
 * playlists are passed in).
 */
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
