import { db } from "@harmonia/db";
import { track } from "@harmonia/db/schema/track";
import { logger } from "@harmonia/logger";
import { and, eq, isNull } from "drizzle-orm";

import { getLyricsFromLRCLib } from "./lrclib-client";

export async function fetchLyricsForPendingTracks(
	userId: string,
): Promise<void> {
	const pendingTracks = await db
		.select()
		.from(track)
		.where(and(eq(track.userId, userId), isNull(track.lyrics)))
		.limit(50);

	if (pendingTracks.length === 0) {
		logger.info({ userId }, "No tracks pending lyrics fetch");
		return;
	}

	logger.info(
		{ userId, count: pendingTracks.length },
		"Fetching lyrics from LRCLib for pending tracks",
	);

	for (const t of pendingTracks) {
		const artistNames: string[] = JSON.parse(t.artistNames) ?? [];
		const primaryArtist = artistNames[0] ?? "";

		if (!t.name || !primaryArtist) {
			continue;
		}

		const lyrics = await getLyricsFromLRCLib({
			trackName: t.name,
			artistName: primaryArtist,
			albumName: t.albumName,
			durationMs: t.durationMs,
		});

		if (!lyrics) {
			await db
				.update(track)
				.set({
					lyricsStatus: "not_found",
					lyricsFetchedAt: new Date(),
				})
				.where(and(eq(track.userId, userId), eq(track.id, t.id)));

			continue;
		}

		await db
			.update(track)
			.set({
				lyrics: lyrics.plainLyrics,
				syncedLyrics: lyrics.syncedLyrics,
				lyricsInstrumental: lyrics.instrumental,
				lrclibId: lyrics.id,
				lyricsStatus: "found",
				lyricsFetchedAt: new Date(),
			})
			.where(and(eq(track.userId, userId), eq(track.id, t.id)));
	}

	logger.info(
		{ userId, count: pendingTracks.length },
		"Completed LRCLib lyrics fetch for pending tracks",
	);
}

