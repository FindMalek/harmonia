import { createGroq } from "@ai-sdk/groq";
import type {
	CreatedPlaylist,
	PlaylistMetadata,
} from "@harmonia/common/schemas";
import { playlistMetadataSchema } from "@harmonia/common/schemas";
import type { GenerateProgress } from "@harmonia/common/types";
import { getLlmTags, llmFieldsFromAnalysis } from "@harmonia/common/types";
import { db } from "@harmonia/db";
import {
	type ClusterMeta,
	cluster,
	clusterTracks,
} from "@harmonia/db/schema/cluster";
import {
	playlist,
	playlistClusters,
	playlistTracks,
} from "@harmonia/db/schema/playlist";
import { track } from "@harmonia/db/schema/track";
import { trackAnalysis } from "@harmonia/db/schema/track-analysis";
import { env } from "@harmonia/env/server";
import { logger } from "@harmonia/logger";
import { llml } from "@zenbase/llml";
import { generateText, Output } from "ai";
import { and, eq, inArray } from "drizzle-orm";
import pLimit from "p-limit";
import pRetry from "p-retry";
import { normalizeTrackTitle } from "../../utils/normalize-track-title";
import { parseJsonStringArray } from "../../utils/parse-json-string-array";
import { getLatestPlaylistTrackIds } from "../music/spotify/playlist-cache";
import {
	jaccardSimilarity,
	matchClustersToPlaylists,
} from "./playlist-matcher";
import { normalizePlaylistName } from "./playlist-naming";
import { diffManualSpotifyEdits } from "./spotify-reconcile";

// Below this track-overlap similarity, a cluster is treated as unrelated to
// any existing playlist and gets a brand new one instead of an update.
const PLAYLIST_MATCH_THRESHOLD = 0.5;

// Below this track-overlap similarity between a matched playlist's old and
// new track set, regenerate the LLM name/description — the content changed
// enough that the old name may no longer fit. At or above it, keep the
// existing name (avoids repeatedly re-naming a barely-changed playlist, and
// saves the LLM call).
const PLAYLIST_METADATA_REGEN_THRESHOLD = 0.8;

type TrackRow = {
	id: string;
	name: string;
	artistNames: string | null;
	llmMood: string | null;
	llmTags: unknown;
};

// GenerateProgress declares updatedPlaylistIds optional (other producers of
// this shape may omit it); this function always populates it.
type GenerateResult = GenerateProgress & {
	updatedPlaylistIds: number[];
	createdPlaylists: CreatedPlaylist[];
};

export async function generatePlaylists(
	userId: string,
	onProgress?: (progress: GenerateResult) => Promise<void>,
): Promise<GenerateResult> {
	const stats: GenerateResult = {
		playlists: 0,
		tracksOrganized: 0,
		updatedPlaylistIds: [],
		createdPlaylists: [],
	};

	if (!env.HARMONIA_GROQ_API_KEY) {
		logger.warn(
			{},
			"No HARMONIA_GROQ_API_KEY configured; skipping playlist generation",
		);
		return stats;
	}

	const clusters = await db
		.select()
		.from(cluster)
		.where(eq(cluster.userId, userId));

	if (clusters.length === 0) {
		logger.info({ userId }, "No clusters found; skipping playlist generation");
		return stats;
	}

	// Existing Harmonia playlists + their current track membership, so new
	// clusters can be matched against them instead of every run recreating
	// everything from scratch (issue #158). Fetched up front, before any
	// per-cluster LLM/DB work, since matching needs the full picture at once.
	const existingPlaylistRows = await db
		.select({
			id: playlist.id,
			name: playlist.name,
			spotifyPlaylistId: playlist.spotifyPlaylistId,
		})
		.from(playlist)
		.where(and(eq(playlist.userId, userId), eq(playlist.isGenerated, true)));

	// Shared across every cluster processed this run so no two playlists land on the same/near-duplicate name (#112).
	const usedPlaylistNames = new Set(
		existingPlaylistRows.map((p) => normalizePlaylistName(p.name)),
	);

	const existingTrackSetsByPlaylist = new Map<number, Set<string>>();
	const spotifyPlaylistIdByPlaylistId = new Map<number, string | null>();
	for (const p of existingPlaylistRows) {
		existingTrackSetsByPlaylist.set(p.id, new Set());
		spotifyPlaylistIdByPlaylistId.set(p.id, p.spotifyPlaylistId);
	}
	if (existingPlaylistRows.length > 0) {
		const existingTrackRows = await db
			.select({
				playlistId: playlistTracks.playlistId,
				trackId: playlistTracks.trackId,
			})
			.from(playlistTracks)
			.where(
				inArray(
					playlistTracks.playlistId,
					existingPlaylistRows.map((p) => p.id),
				),
			);
		for (const row of existingTrackRows) {
			existingTrackSetsByPlaylist.get(row.playlistId)?.add(row.trackId);
		}
	}

	// Fetch each cluster's track rows up front (parallelized) so matching can
	// run before the per-cluster generation loop decides create vs. update.
	const fetchLimit = pLimit(5);
	const clusterTrackRows = await Promise.all(
		clusters.map((c) =>
			fetchLimit(async () => {
				const rows = await db
					.select({
						id: track.id,
						name: track.name,
						artistNames: track.artistNames,
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
					.from(clusterTracks)
					.innerJoin(track, eq(track.id, clusterTracks.trackId))
					.leftJoin(trackAnalysis, eq(trackAnalysis.trackId, track.id))
					.where(eq(clusterTracks.clusterId, c.id))
					.orderBy(clusterTracks.position);
				return {
					clusterId: c.id,
					rows: rows.map(({ id, name, artistNames, ...analysis }) => ({
						id,
						name,
						artistNames,
						...llmFieldsFromAnalysis(analysis),
					})),
				};
			}),
		),
	);
	const trackRowsByClusterId = new Map(
		clusterTrackRows.map((c) => [c.clusterId, c.rows]),
	);

	const matches = matchClustersToPlaylists(
		clusters
			.map((c, clusterIndex) => ({
				clusterIndex,
				trackIds: new Set(
					(trackRowsByClusterId.get(c.id) ?? []).map((t) => t.id),
				),
			}))
			.filter((c) => c.trackIds.size > 0),
		existingPlaylistRows.map((p) => ({
			playlistId: p.id,
			trackIds: existingTrackSetsByPlaylist.get(p.id) ?? new Set(),
		})),
		PLAYLIST_MATCH_THRESHOLD,
	);
	const matchedPlaylistIdByClusterIndex = new Map(
		matches.map((m) => [m.clusterIndex, m.playlistId]),
	);

	// A playlist that no longer matches any current cluster is an orphan (#206)
	// — clustering has moved on but nothing ever cleaned it up. Only prune ones
	// never exported to Spotify; an already-exported orphan is left alone until
	// there's a deliberate staleness UX, since deleting the Harmonia row
	// wouldn't touch the real Spotify playlist the user may still be using.
	const { prunable: prunablePlaylistIds, exportedOrphanCount } =
		findPrunableOrphanedPlaylists(
			existingPlaylistRows,
			new Set(matches.map((m) => m.playlistId)),
		);

	if (prunablePlaylistIds.length > 0) {
		await db.delete(playlist).where(inArray(playlist.id, prunablePlaylistIds));
		logger.info(
			{ userId, prunedCount: prunablePlaylistIds.length },
			"Pruned orphaned playlists that no longer match any cluster and were never exported",
		);
	}

	if (exportedOrphanCount > 0) {
		logger.warn(
			{ userId, exportedOrphanCount },
			"Some exported playlists no longer match any current cluster; left untouched pending a staleness UX decision (#206)",
		);
	}

	const genLimit = pLimit(5);

	await Promise.all(
		clusters.map((c, clusterIndex) =>
			genLimit(async () => {
				const trackRows = trackRowsByClusterId.get(c.id) ?? [];
				if (trackRows.length === 0) return;

				const matchedPlaylistId =
					matchedPlaylistIdByClusterIndex.get(clusterIndex);

				if (matchedPlaylistId !== undefined) {
					const updated = await updateExistingPlaylist({
						userId,
						playlistId: matchedPlaylistId,
						spotifyPlaylistId:
							spotifyPlaylistIdByPlaylistId.get(matchedPlaylistId) ?? null,
						clusterId: c.id,
						meta: c.metadata,
						trackRows,
						oldTrackIds:
							existingTrackSetsByPlaylist.get(matchedPlaylistId) ?? new Set(),
						usedPlaylistNames,
					});
					if (updated) {
						stats.playlists++;
						stats.tracksOrganized += trackRows.length;
						stats.updatedPlaylistIds.push(matchedPlaylistId);
						await onProgress?.(stats);
					}
					return;
				}

				const created = await createNewPlaylist({
					userId,
					clusterId: c.id,
					genreDomainId: c.genreDomainId,
					meta: c.metadata,
					trackRows,
					usedPlaylistNames,
				});
				if (created) {
					stats.playlists++;
					stats.tracksOrganized += trackRows.length;
					stats.createdPlaylists.push(created);
					await onProgress?.(stats);
				}
			}),
		),
	);

	logger.info(
		{
			userId,
			playlists: stats.playlists,
			updated: stats.updatedPlaylistIds.length,
			created: stats.createdPlaylists.length,
		},
		"Completed playlist generation",
	);

	return stats;
}

/**
 * Adjusts a cluster's track rows so a manual edit the user made directly on
 * Spotify since the last export survives this run: tracks manually removed
 * are excluded even if clustering would still place them here, and tracks
 * manually added are preserved even though clustering doesn't know about
 * them (#159). No-op if the playlist was never exported or hasn't been
 * synced yet (getLatestPlaylistTrackIds returns null).
 */
async function reconcileManualSpotifyEdits(args: {
	userId: string;
	playlistId: number;
	spotifyPlaylistId: string | null;
	clusterTrackRows: TrackRow[];
	oldTrackIds: Set<string>;
}): Promise<TrackRow[]> {
	const {
		userId,
		playlistId,
		spotifyPlaylistId,
		clusterTrackRows,
		oldTrackIds,
	} = args;

	if (!spotifyPlaylistId) return clusterTrackRows;

	const liveTrackIds = await getLatestPlaylistTrackIds(
		userId,
		spotifyPlaylistId,
	);
	if (!liveTrackIds) return clusterTrackRows;

	const { added, removed } = diffManualSpotifyEdits(oldTrackIds, liveTrackIds);
	if (added.length === 0 && removed.length === 0) return clusterTrackRows;

	const removedSet = new Set(removed);
	let trackRows = clusterTrackRows.filter((t) => !removedSet.has(t.id));

	const clusterTrackIds = new Set(trackRows.map((t) => t.id));
	const missingAdded = added.filter((id) => !clusterTrackIds.has(id));
	if (missingAdded.length > 0) {
		const addedRows = await db
			.select({
				id: track.id,
				name: track.name,
				artistNames: track.artistNames,
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
			.where(inArray(track.id, missingAdded));
		trackRows = [
			...trackRows,
			...addedRows.map(({ id, name, artistNames, ...analysis }) => ({
				id,
				name,
				artistNames,
				...llmFieldsFromAnalysis(analysis),
			})),
		];
	}

	logger.info(
		{
			playlistId,
			spotifyPlaylistId,
			manuallyAdded: missingAdded.length,
			manuallyRemoved: removed.length,
		},
		"Reconciled manual Spotify edits into playlist regeneration",
	);

	return trackRows;
}

async function updateExistingPlaylist(args: {
	userId: string;
	playlistId: number;
	spotifyPlaylistId: string | null;
	clusterId: number;
	meta: ClusterMeta | null;
	trackRows: TrackRow[];
	oldTrackIds: Set<string>;
	usedPlaylistNames: Set<string>;
}): Promise<boolean> {
	const {
		userId,
		playlistId,
		spotifyPlaylistId,
		clusterId,
		meta,
		oldTrackIds,
		usedPlaylistNames,
	} = args;

	const reconciledTrackRows = await reconcileManualSpotifyEdits({
		userId,
		playlistId,
		spotifyPlaylistId,
		clusterTrackRows: args.trackRows,
		oldTrackIds,
	});
	const trackRows = dedupeTracksBySongIdentity(reconciledTrackRows);

	const newTrackIds = new Set(trackRows.map((t) => t.id));
	const similarity = jaccardSimilarity(oldTrackIds, newTrackIds);

	// Identical membership (order-only differences aside) — nothing changed,
	// skip the write entirely so an unchanged playlist doesn't get touched
	// (and doesn't trigger a needless Spotify re-export downstream).
	if (similarity === 1) return false;

	const shouldRegenerateMetadata =
		similarity < PLAYLIST_METADATA_REGEN_THRESHOLD;

	let generatedMetadata: PlaylistMetadata | null = null;

	if (shouldRegenerateMetadata) {
		try {
			generatedMetadata = await generateUniquePlaylistMetadata(
				meta,
				trackRows,
				usedPlaylistNames,
			);
		} catch (err) {
			logger.error(
				{
					playlistId,
					clusterId,
					error: err instanceof Error ? err.message : String(err),
				},
				"Failed to regenerate playlist metadata during update; keeping existing name",
			);
		}
	}

	const orderedTracks = orderTracksByEnergy(trackRows);
	const tags = deriveTags(meta, trackRows);

	try {
		await db.transaction(async (tx) => {
			await tx
				.update(playlist)
				.set({
					trackCount: orderedTracks.length,
					...(generatedMetadata && {
						name: generatedMetadata.name,
						aiGeneratedName: generatedMetadata.name,
						description: generatedMetadata.description,
						theme: meta?.themeSummary ?? null,
						taxonomy: generatedMetadata.taxonomy,
						coverColor: generatedMetadata.coverColor,
						tags: tags.length > 0 ? tags : null,
					}),
				})
				.where(eq(playlist.id, playlistId));

			// The cluster this playlist maps to is always this run's fresh
			// cluster row — last run's playlistClusters row already cascade-
			// deleted when runClustering() wiped last run's cluster table.
			// Upsert defensively: harmless if the row is already unique, but
			// keeps this idempotent against any future retry path.
			await tx
				.insert(playlistClusters)
				.values({ playlistId, clusterId, position: 0, weight: 1.0 })
				.onConflictDoUpdate({
					target: [playlistClusters.playlistId, playlistClusters.clusterId],
					set: { position: 0, weight: 1.0 },
				});

			// No positional diff: nothing in the app lets a user reorder tracks
			// within a Harmonia playlist (ordering is always algorithmic, via
			// orderTracksByEnergy), so a full replace is equivalent to a diff
			// here and considerably simpler.
			await tx
				.delete(playlistTracks)
				.where(eq(playlistTracks.playlistId, playlistId));

			if (orderedTracks.length > 0) {
				const batchSize = 100;
				for (let i = 0; i < orderedTracks.length; i += batchSize) {
					await tx.insert(playlistTracks).values(
						orderedTracks.slice(i, i + batchSize).map((t, position) => ({
							playlistId,
							trackId: t.id,
							position: i + position,
						})),
					);
				}
			}
		});
	} catch (err) {
		logger.error(
			{
				playlistId,
				clusterId,
				error: err instanceof Error ? err.message : String(err),
			},
			"Failed to update existing playlist for cluster",
		);
		return false;
	}

	return true;
}

async function createNewPlaylist(args: {
	userId: string;
	clusterId: number;
	genreDomainId: number;
	meta: ClusterMeta | null;
	trackRows: TrackRow[];
	usedPlaylistNames: Set<string>;
}): Promise<CreatedPlaylist | null> {
	const { userId, clusterId, genreDomainId, meta, usedPlaylistNames } = args;
	const trackRows = dedupeTracksBySongIdentity(args.trackRows);

	try {
		const generated = await generateUniquePlaylistMetadata(
			meta,
			trackRows,
			usedPlaylistNames,
		);
		const tags = deriveTags(meta, trackRows);
		const orderedTracks = orderTracksByEnergy(trackRows);

		const [inserted] = await db
			.insert(playlist)
			.values({
				userId,
				name: generated.name,
				aiGeneratedName: generated.name,
				description: generated.description,
				theme: meta?.themeSummary ?? null,
				taxonomy: generated.taxonomy,
				genreDomainId,
				coverColor: generated.coverColor,
				tags: tags.length > 0 ? tags : null,
				trackCount: orderedTracks.length,
				isGenerated: true,
				updatedAt: new Date(),
			})
			.returning({ id: playlist.id });

		if (!inserted) return null;

		await db.insert(playlistClusters).values({
			playlistId: inserted.id,
			clusterId,
			position: 0,
			weight: 1.0,
		});

		if (orderedTracks.length > 0) {
			const batchSize = 100;
			for (let i = 0; i < orderedTracks.length; i += batchSize) {
				await db.insert(playlistTracks).values(
					orderedTracks.slice(i, i + batchSize).map((t, position) => ({
						playlistId: inserted.id,
						trackId: t.id,
						position: i + position,
					})),
				);
			}
		}

		return { id: inserted.id, name: generated.name };
	} catch (err) {
		logger.error(
			{
				clusterId,
				error: err instanceof Error ? err.message : String(err),
			},
			"Failed to generate playlist for cluster",
		);
		return null;
	}
}

/**
 * Splits existing playlists into ones prunable now (no current cluster match
 * and never exported to Spotify) vs. exported orphans, which are left alone
 * pending a staleness UX decision (#206). Pure, no I/O.
 */
export function findPrunableOrphanedPlaylists(
	existingPlaylists: Array<{ id: number; spotifyPlaylistId: string | null }>,
	matchedPlaylistIds: ReadonlySet<number>,
): { prunable: number[]; exportedOrphanCount: number } {
	const orphaned = existingPlaylists.filter(
		(p) => !matchedPlaylistIds.has(p.id),
	);
	const prunable = orphaned
		.filter((p) => !p.spotifyPlaylistId)
		.map((p) => p.id);
	const exportedOrphanCount = orphaned.length - prunable.length;
	return { prunable, exportedOrphanCount };
}

/**
 * Drops same-song duplicates from a single playlist's track set — a
 * duplicate library entry, or two near-identical versions that both landed
 * in the same cluster despite #130's sync-time dedup, would otherwise mean
 * hearing the same song twice in one playlist (#160). Keyed by normalized
 * (title, primary artist); keeps the lexicographically smallest track ID per
 * group for a deterministic result. This is per-playlist only — the same
 * song can still appear across two different Harmonia playlists.
 */
export function dedupeTracksBySongIdentity(trackRows: TrackRow[]): TrackRow[] {
	const canonicalByKey = new Map<string, TrackRow>();

	for (const t of trackRows) {
		const primaryArtist = parseJsonStringArray(t.artistNames)[0] ?? "";
		const key = `${normalizeTrackTitle(t.name).toLowerCase()}|||${primaryArtist.toLowerCase()}`;
		const existing = canonicalByKey.get(key);
		if (!existing || t.id < existing.id) {
			canonicalByKey.set(key, t);
		}
	}

	return [...canonicalByKey.values()];
}

function deriveTags(meta: ClusterMeta | null, trackRows: TrackRow[]): string[] {
	const vibes: string[] = [];
	for (const t of trackRows) {
		const tags = getLlmTags(t.llmTags);
		if (tags.vibe) vibes.push(...tags.vibe);
	}
	return [...new Set(meta?.topVibes?.length ? meta.topVibes : vibes)]
		.slice(0, 3)
		.map((t) => t.toLowerCase());
}

// Bound on retrying a colliding playlist name before accepting it as-is (#112).
const MAX_NAME_COLLISION_RETRIES = 2;

/** Retries generatePlaylistMetadata against an avoid-list until the name doesn't collide with another playlist chosen this run (#112). */
async function generateUniquePlaylistMetadata(
	meta: ClusterMeta | null,
	trackRows: TrackRow[],
	usedPlaylistNames: Set<string>,
): Promise<PlaylistMetadata> {
	const avoidNames: string[] = [];

	for (let attempt = 0; attempt <= MAX_NAME_COLLISION_RETRIES; attempt++) {
		const result = await generatePlaylistMetadata(meta, trackRows, avoidNames);
		const normalized = normalizePlaylistName(result.name);

		if (!usedPlaylistNames.has(normalized)) {
			usedPlaylistNames.add(normalized);
			return result;
		}

		if (attempt < MAX_NAME_COLLISION_RETRIES) {
			logger.warn(
				{ name: result.name },
				"Generated playlist name collided with an existing one; retrying with an avoid-list",
			);
			avoidNames.push(result.name);
		} else {
			// Exhausted retries — accept it. A repeated name is a worse-but-rare
			// outcome, not worth blocking generation over.
			usedPlaylistNames.add(normalized);
			return result;
		}
	}

	// Unreachable given the loop bounds above, but keeps TypeScript satisfied
	// without a non-null assertion.
	throw new Error("generateUniquePlaylistMetadata: exhausted retry loop");
}

async function generatePlaylistMetadata(
	meta: ClusterMeta | null,
	trackRows: TrackRow[],
	avoidNames: string[] = [],
): Promise<PlaylistMetadata> {
	const sampleTracks = trackRows.slice(0, 8).map((t) => {
		const artists = parseJsonStringArray(t.artistNames);
		return `${t.name} by ${artists.join(", ")}`;
	});

	const moods: string[] = [];
	const themes: string[] = [];
	const vibes: string[] = [];
	for (const t of trackRows) {
		if (t.llmMood) moods.push(t.llmMood);
		const tags = getLlmTags(t.llmTags);
		if (tags.themes) themes.push(...tags.themes);
		if (tags.vibe) vibes.push(...tags.vibe);
	}

	return pRetry(
		async () => {
			const clusterInfo: Record<string, string | number> = {
				mood: meta
					? meta.dominantMood
					: [...new Set(moods)].slice(0, 5).join(", "),
				topThemes: [...new Set(themes)].slice(0, 5).join(", ") || "various",
				topVibes: [...new Set(vibes)].slice(0, 5).join(", ") || "various",
				trackCount: trackRows.length,
				sampleTracks: sampleTracks.join("; "),
			};
			if (meta?.themeSummary) clusterInfo.theme = meta.themeSummary;
			if (meta?.dominantEnergy) clusterInfo.energy = meta.dominantEnergy;
			if (meta?.suggestedArchetype)
				clusterInfo.archetype = meta.suggestedArchetype;
			if (avoidNames.length > 0) {
				clusterInfo.namesToAvoid = avoidNames.join(", ");
			}

			const groq = createGroq({ apiKey: env.HARMONIA_GROQ_API_KEY });
			const { output } = await generateText({
				model: groq("openai/gpt-oss-120b"),
				output: Output.object({ schema: playlistMetadataSchema }),
				// Not 0: temperature 0 made similar clusters always name "midnight" etc (#112).
				temperature: 0.8,
				prompt: llml({
					role: "You are a creative music curator generating a playlist from a cluster of similar tracks.",
					clusterInfo,
					generate: [
						"name: a creative, evocative playlist name (2-4 words) drawn from the specific sample tracks and mood below — no generic names like 'My Playlist', and avoid overused stock words like 'midnight', 'vibes', 'dreams', 'chill' unless a sample track title genuinely justifies it",
						...(avoidNames.length > 0
							? [
									"This is a retry: the previous name collided with one already used this run (listed in namesToAvoid) — pick a meaningfully different name and style, not a small variation on it",
								]
							: []),
						"description: one short sentence (10-15 words max) capturing the vibe — no filler phrases",
						"taxonomy: mood | situation | genre | hybrid",
						"coverColor: a hex color code that matches the playlist vibe (e.g. #1a1a2e for dark moody, #ff6b6b for energetic)",
					],
				}),
			});
			return output;
		},
		{
			retries: 2,
			minTimeout: 2000,
			onFailedAttempt: (error) => {
				logger.warn(
					{ attempt: error.attemptNumber },
					"Playlist metadata generation failed, retrying",
				);
			},
		},
	);
}

function orderTracksByEnergy(tracks: TrackRow[]): TrackRow[] {
	const energyMap: Record<string, number> = {
		"very low": 1,
		low: 2,
		medium: 3,
		high: 4,
		"very high": 5,
	};

	const withEnergy = tracks.map((t) => {
		const tags = getLlmTags(t.llmTags);
		const level = tags.energyLevel?.toLowerCase() ?? "medium";
		return { ...t, energyScore: energyMap[level] ?? 3 };
	});

	withEnergy.sort((a, b) => a.energyScore - b.energyScore);

	const n = withEnergy.length;
	if (n <= 2) return withEnergy;

	const result: typeof withEnergy = [];
	const mid = Math.floor(n / 2);

	for (let i = 0; i < n; i++) {
		const item = i < mid ? withEnergy[i] : withEnergy[n - 1 - (i - mid)];
		if (item) result.push(item);
	}

	return result;
}
