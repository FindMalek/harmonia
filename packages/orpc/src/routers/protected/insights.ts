import { emptyInput, insightsSummarySchema } from "@harmonia/common/schemas";
import { db } from "@harmonia/db";
import { cluster } from "@harmonia/db/schema/cluster";
import { genreDomain } from "@harmonia/db/schema/genre-domain";
import { pipelineRun } from "@harmonia/db/schema/pipeline-run";
import { playlist, playlistTracks } from "@harmonia/db/schema/playlist";
import { userSpotifyLibraryStats } from "@harmonia/db/schema/spotify";
import { track, userTracks } from "@harmonia/db/schema/track";
import { and, count, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { protectedProcedure } from "../../procedures";

function numAvg(values: (number | null | undefined)[]): number | null {
	const valid = values.filter((n): n is number => n != null);
	return valid.length === 0
		? null
		: valid.reduce((a, b) => a + b, 0) / valid.length;
}

function normalizeEra(era: string): string | null {
	const digits = era.replace(/\D/g, "");
	if (digits.length >= 4) {
		const year = parseInt(digits.slice(0, 4));
		if (year >= 1950 && year <= 2029) {
			return `${Math.floor(year / 10) * 10}s`;
		}
	}
	if (digits.length === 2) {
		const d = parseInt(digits);
		if (d >= 50 && d <= 99) return `19${digits}s`;
		if (d >= 0 && d <= 29) return `20${digits.padStart(2, "0")}s`;
	}
	return null;
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
	summary: protectedProcedure
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
				pipelineRunRows,
				genreBreakdownRows,
				generatedPlaylistRows,
				clusterRows,
				coveredTrackRows,
				classifiedTrackRows,
				trackCountRows,
				distinctGenreDomainRows,
			] = await Promise.all([
				db
					.select()
					.from(userSpotifyLibraryStats)
					.where(eq(userSpotifyLibraryStats.userId, userId))
					.limit(1),

				db
					.select({ status: pipelineRun.status })
					.from(pipelineRun)
					.where(eq(pipelineRun.userId, userId))
					.orderBy(desc(pipelineRun.createdAt))
					.limit(20),

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

				db
					.select({
						llmMood: track.llmMood,
						llmTags: track.llmTags,
						energy: track.energy,
						valence: track.valence,
						danceability: track.danceability,
						acousticness: track.acousticness,
						instrumentalness: track.instrumentalness,
						speechiness: track.speechiness,
						liveness: track.liveness,
					})
					.from(track)
					.where(
						and(
							inArray(track.id, userTrackIds),
							isNotNull(track.llmClassifiedAt),
						),
					),

				db
					.select({
						total: count(),
						withLyrics: count(track.lyrics),
						classified: count(track.llmClassifiedAt),
						embedded: count(track.embeddingGeneratedAt),
					})
					.from(track)
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
			const hasClassifyRun = classifiedTrackRows.length > 0;
			const isPipelineStable = !pipelineRunRows.some(
				(r) => r.status === "running",
			);

			// JS aggregation over classified tracks
			const moodMap = new Map<string, number>();
			const secondaryMoodMap = new Map<string, number>();
			const eraMap = new Map<string, number>();
			const themeMap = new Map<string, number>();
			const vibeMap = new Map<string, number>();

			for (const t of classifiedTrackRows) {
				if (t.llmMood?.trim()) {
					const m = t.llmMood.trim();
					moodMap.set(m, (moodMap.get(m) ?? 0) + 1);
				}
				const tags = t.llmTags;
				if (tags) {
					for (const sm of tags.secondaryMoods ?? []) {
						if (sm.trim())
							secondaryMoodMap.set(sm, (secondaryMoodMap.get(sm) ?? 0) + 1);
					}
					const normalizedEra = tags.era ? normalizeEra(tags.era) : null;
					if (normalizedEra)
						eraMap.set(normalizedEra, (eraMap.get(normalizedEra) ?? 0) + 1);
					for (const th of tags.themes ?? []) {
						if (th.trim()) themeMap.set(th, (themeMap.get(th) ?? 0) + 1);
					}
					for (const v of tags.vibe ?? []) {
						if (v.trim()) vibeMap.set(v, (vibeMap.get(v) ?? 0) + 1);
					}
				}
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

			const sonicDna = hasClassifyRun
				? {
						valence: numAvg(classifiedTrackRows.map((t) => t.valence)),
						energy: numAvg(classifiedTrackRows.map((t) => t.energy)),
						danceability: numAvg(
							classifiedTrackRows.map((t) => t.danceability),
						),
						acousticness: numAvg(
							classifiedTrackRows.map((t) => t.acousticness),
						),
						instrumentalness: numAvg(
							classifiedTrackRows.map((t) => t.instrumentalness),
						),
						speechiness: numAvg(classifiedTrackRows.map((t) => t.speechiness)),
						liveness: numAvg(classifiedTrackRows.map((t) => t.liveness)),
					}
				: null;

			const avgEnergy = numAvg(classifiedTrackRows.map((t) => t.energy));

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
					classified: trackCounts?.classified ?? 0,
					embedded: trackCounts?.embedded ?? 0,
				},
				isSystemConnected: true,
				isPipelineStable,
				hasClassifyRun,
				hasGenerateRun,
			};
		}),
};
