import { emptyInput, insightsSummarySchema } from "@sonaraem/common/schemas";
import { db } from "@sonaraem/db";
import { cluster } from "@sonaraem/db/schema/cluster";
import { genreDomain } from "@sonaraem/db/schema/genre-domain";
import { pipelineRun } from "@sonaraem/db/schema/pipeline-run";
import { playlist, playlistTracks } from "@sonaraem/db/schema/playlist";
import { userSpotifyLibraryStats } from "@sonaraem/db/schema/spotify";
import { track, userTracks } from "@sonaraem/db/schema/track";
import { trackAnalysis } from "@sonaraem/db/schema/track-analysis";
import {
	and,
	count,
	countDistinct,
	desc,
	eq,
	inArray,
	isNotNull,
} from "drizzle-orm";
import { approvedProcedure } from "../../procedures";

function normalizeEra(era: string): string | null {
	const digits = era.replace(/\D/g, "");
	if (digits.length >= 4) {
		const year = Number.parseInt(digits.slice(0, 4));
		if (year >= 1950 && year <= 2029) {
			return `${Math.floor(year / 10) * 10}s`;
		}
	}
	if (digits.length === 2) {
		const d = Number.parseInt(digits);
		if (d >= 50 && d <= 99) return `19${digits}s`;
		if (d >= 0 && d <= 29) return `20${digits.padStart(2, "0")}s`;
	}
	return null;
}

function energyFromLevel(level: string | null | undefined): number | null {
	const map: Record<string, number> = {
		"very low": 0.1,
		low: 0.3,
		medium: 0.5,
		high: 0.7,
		"very high": 0.9,
	};
	return level ? (map[level] ?? null) : null;
}

function topStringMap(
	map: Map<string, number>,
	limit: number,
): Array<{ key: string; count: number }> {
	return [...map.entries()]
		.sort(([, a], [, b]) => b - a)
		.slice(0, limit)
		.map(([key, c]) => ({ key, count: c }));
}

export const insightsRouter = {
	summary: approvedProcedure
		.input(emptyInput)
		.output(insightsSummarySchema)
		.handler(async ({ context }) => {
			const userId = context.session.user.id;

			const userTrackIds = db
				.select({ trackId: userTracks.trackId })
				.from(userTracks)
				.where(eq(userTracks.userId, userId));

			const [
				spotifyStatsRows,
				runningPipelineRows,
				genreBreakdownRows,
				generatedPlaylistRows,
				clusterRows,
				coveredTrackRows,
				classifiedTrackRows,
				trackCountRows,
				classifiedCountRows,
				distinctGenreDomainRows,
			] = await Promise.all([
				db
					.select()
					.from(userSpotifyLibraryStats)
					.where(eq(userSpotifyLibraryStats.userId, userId))
					.limit(1),

				// Check for any active pipeline runs — single row, no ordering needed
				db
					.select({ id: pipelineRun.id })
					.from(pipelineRun)
					.where(
						and(
							eq(pipelineRun.userId, userId),
							eq(pipelineRun.status, "running"),
						),
					)
					.limit(1),

				db
					.select({ name: genreDomain.name, count: count() })
					.from(track)
					.innerJoin(genreDomain, eq(track.genreDomainId, genreDomain.id))
					.where(
						and(
							inArray(track.id, userTrackIds),
							isNotNull(track.genreDomainId),
						),
					)
					.groupBy(genreDomain.name)
					.orderBy(desc(count()))
					.limit(8),

				db
					.select({
						id: playlist.id,
						trackCount: playlist.trackCount,
						exportedAt: playlist.exportedAt,
					})
					.from(playlist)
					.where(
						and(eq(playlist.userId, userId), eq(playlist.isGenerated, true)),
					),

				db
					.select({
						avgValence: cluster.avgValence,
						avgEnergy: cluster.avgEnergy,
						size: cluster.size,
					})
					.from(cluster)
					.where(eq(cluster.userId, userId)),

				db
					.selectDistinct({ trackId: playlistTracks.trackId })
					.from(playlistTracks)
					.innerJoin(playlist, eq(playlistTracks.playlistId, playlist.id))
					.where(
						and(eq(playlist.userId, userId), eq(playlist.isGenerated, true)),
					),

				// Only select LLM-produced fields — Spotify audio features are deprecated
				// (API removed Nov 2024) and will always be null
				db
					.select({
						mood: trackAnalysis.mood,
						secondaryMoods: trackAnalysis.secondaryMoods,
						themes: trackAnalysis.themes,
						vibe: trackAnalysis.vibe,
						era: trackAnalysis.era,
						energyLevel: trackAnalysis.energyLevel,
					})
					.from(trackAnalysis)
					.innerJoin(track, eq(track.id, trackAnalysis.trackId))
					.where(inArray(track.id, userTrackIds)),

				db
					.select({
						total: count(),
						withLyrics: count(track.lyrics),
						embedded: count(track.embeddingGeneratedAt),
					})
					.from(track)
					.where(inArray(track.id, userTrackIds)),

				db
					.select({ classified: countDistinct(trackAnalysis.trackId) })
					.from(trackAnalysis)
					.innerJoin(track, eq(track.id, trackAnalysis.trackId))
					.where(inArray(track.id, userTrackIds)),

				db
					.selectDistinct({ genreDomainId: track.genreDomainId })
					.from(track)
					.where(
						and(
							inArray(track.id, userTrackIds),
							isNotNull(track.genreDomainId),
						),
					),
			]);

			const spotifyStats = spotifyStatsRows[0];
			const trackCounts = trackCountRows[0];
			const classifiedCount = classifiedCountRows[0]?.classified ?? 0;
			const hasClassifyRun = classifiedTrackRows.length > 0;
			const isPipelineStable = runningPipelineRows.length === 0;

			// Single-pass JS aggregation over classified tracks
			const moodMap = new Map<string, number>();
			const secondaryMoodMap = new Map<string, number>();
			const eraMap = new Map<string, number>();
			const themeMap = new Map<string, number>();
			const vibeMap = new Map<string, number>();
			const energyValues: number[] = [];

			for (const t of classifiedTrackRows) {
				if (t.mood?.trim()) {
					const m = t.mood.trim();
					moodMap.set(m, (moodMap.get(m) ?? 0) + 1);
				}
				for (const sm of t.secondaryMoods ?? []) {
					if (sm.trim())
						secondaryMoodMap.set(sm, (secondaryMoodMap.get(sm) ?? 0) + 1);
				}
				const normalizedEra = t.era ? normalizeEra(t.era) : null;
				if (normalizedEra)
					eraMap.set(normalizedEra, (eraMap.get(normalizedEra) ?? 0) + 1);
				for (const th of t.themes ?? []) {
					if (th.trim()) themeMap.set(th, (themeMap.get(th) ?? 0) + 1);
				}
				for (const v of t.vibe ?? []) {
					if (v.trim()) vibeMap.set(v, (vibeMap.get(v) ?? 0) + 1);
				}
				const e = energyFromLevel(t.energyLevel);
				if (e !== null) energyValues.push(e);
			}

			const totalClassified = classifiedTrackRows.length;

			const moodDistribution = topStringMap(moodMap, 8).map(
				({ key, count: c }) => ({
					mood: key,
					count: c,
					percentage: totalClassified > 0 ? (c / totalClassified) * 100 : 0,
				}),
			);

			const topVibes = topStringMap(vibeMap, 15).map(({ key }) => key);
			const topThemes = topStringMap(themeMap, 3).map(({ key }) => key);

			const eraDistribution = [...eraMap.entries()]
				.sort(([a], [b]) => a.localeCompare(b))
				.map(([era, c]) => ({ era, count: c }));

			const favoriteEra = topStringMap(eraMap, 1)[0]?.key ?? null;
			const primaryMood = topStringMap(moodMap, 1)[0]?.key ?? null;
			const secondaryMood = topStringMap(secondaryMoodMap, 1)[0]?.key ?? null;

			const avgEnergy =
				energyValues.length > 0
					? energyValues.reduce((a, b) => a + b, 0) / energyValues.length
					: null;

			// Spotify audio features (valence, danceability, etc.) are always null —
			// the API was deprecated in Nov 2024. Energy is derived from llmTags.energyLevel.
			const sonicDna = hasClassifyRun
				? {
						energy: avgEnergy,
						valence: null,
						danceability: null,
						acousticness: null,
						instrumentalness: null,
						speechiness: null,
						liveness: null,
					}
				: null;

			const totalGenreTracks = genreBreakdownRows.reduce(
				(acc, g) => acc + g.count,
				0,
			);
			const genreBreakdown = genreBreakdownRows.map((g) => ({
				name: g.name,
				count: g.count,
				percentage:
					totalGenreTracks > 0 ? (g.count / totalGenreTracks) * 100 : 0,
			}));

			const landscape =
				clusterRows.length > 0
					? { angryIntense: 0, euphoric: 0, darkBrooding: 0, chillHappy: 0 }
					: null;
			if (landscape) {
				for (const c of clusterRows) {
					const e = c.avgEnergy ?? 0.5;
					const v = c.avgValence ?? 0.5;
					if (e >= 0.5 && v < 0.5) landscape.angryIntense += c.size;
					else if (e >= 0.5 && v >= 0.5) landscape.euphoric += c.size;
					else if (e < 0.5 && v < 0.5) landscape.darkBrooding += c.size;
					else landscape.chillHappy += c.size;
				}
			}

			const hasGenerateRun = generatedPlaylistRows.length > 0;
			const totalUserTracks = trackCounts?.total ?? 0;
			const coveredCount = coveredTrackRows.length;

			const playlistCoverage = hasGenerateRun
				? {
						percentage:
							totalUserTracks > 0 ? (coveredCount / totalUserTracks) * 100 : 0,
						coveredTracks: coveredCount,
						totalTracks: totalUserTracks,
						totalPlaylists: generatedPlaylistRows.length,
						exportedPlaylists: generatedPlaylistRows.filter(
							(p) => p.exportedAt !== null,
						).length,
						avgTracksPerPlaylist:
							generatedPlaylistRows.length > 0
								? generatedPlaylistRows.reduce(
										(acc, p) => acc + (p.trackCount ?? 0),
										0,
									) / generatedPlaylistRows.length
								: 0,
					}
				: null;

			return {
				library: {
					totalTracks: spotifyStats?.totalTracks ?? trackCounts?.total ?? 0,
					uniqueArtists: spotifyStats?.uniqueArtists ?? 0,
					genreDomains: distinctGenreDomainRows.length,
					generatedPlaylists: generatedPlaylistRows.length,
				},
				personality: hasClassifyRun
					? { primaryMood, secondaryMood, favoriteEra, eraDistribution }
					: null,
				listening: hasClassifyRun
					? {
							topGenre: genreBreakdownRows[0]?.name ?? null,
							topThemes,
							avgEnergy,
						}
					: null,
				sonicDna,
				moodDistribution,
				topVibes,
				genreBreakdown,
				emotionalLandscape: landscape,
				playlistCoverage,
				processingStatus: {
					total: trackCounts?.total ?? 0,
					withLyrics: trackCounts?.withLyrics ?? 0,
					classified: classifiedCount,
					embedded: trackCounts?.embedded ?? 0,
				},
				isSystemConnected: true,
				isPipelineStable,
				hasClassifyRun,
				hasGenerateRun,
			};
		}),
};
