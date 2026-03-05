import { db } from "@harmonia/db";
import {
	cluster,
	clusterTracks,
	type ClusterMeta,
} from "@harmonia/db/schema/cluster";
import {
	playlist,
	playlistClusters,
	playlistTracks,
} from "@harmonia/db/schema/playlist";
import { track } from "@harmonia/db/schema/track";
import { env } from "@harmonia/env/server";
import { logger } from "@harmonia/logger";
import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { and, eq } from "drizzle-orm";
import pRetry from "p-retry";

import { playlistMetadataSchema } from "./schemas";

const groq = createOpenAI({
	apiKey: env.GROQ_API_KEY,
	baseURL: "https://api.groq.com/openai/v1",
});

export type GenerateProgress = {
	playlists: number;
};

export async function generatePlaylists(
	userId: string,
	onProgress?: (progress: GenerateProgress) => Promise<void>,
): Promise<GenerateProgress> {
	const stats: GenerateProgress = { playlists: 0 };

	if (!env.GROQ_API_KEY) {
		logger.warn({}, "No GROQ_API_KEY configured; skipping playlist generation");
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

	await db.delete(playlist).where(
		and(eq(playlist.userId, userId), eq(playlist.isGenerated, true)),
	);

	for (const c of clusters) {
		const trackRows = await db
			.select({
				id: track.id,
				name: track.name,
				artistNames: track.artistNames,
				llmMood: track.llmMood,
				llmTags: track.llmTags,
			})
			.from(clusterTracks)
			.innerJoin(track, eq(track.id, clusterTracks.trackId))
			.where(eq(clusterTracks.clusterId, c.id))
			.orderBy(clusterTracks.position);

		if (trackRows.length === 0) continue;

		const meta = c.metadata as ClusterMeta | null;

		const sampleTracks = trackRows.slice(0, 8).map((t) => {
			const artists = JSON.parse(t.artistNames) as string[];
			return `${t.name} by ${artists.join(", ")}`;
		});

		const moods: string[] = [];
		const themes: string[] = [];
		const vibes: string[] = [];
		for (const t of trackRows) {
			if (t.llmMood) moods.push(t.llmMood);
			const tags = (t.llmTags as Record<string, unknown>) ?? {};
			if (Array.isArray(tags.themes)) themes.push(...(tags.themes as string[]));
			if (Array.isArray(tags.vibe)) vibes.push(...(tags.vibe as string[]));
		}

		try {
			const generated = await pRetry(
				async () => {
					const { object } = await generateObject({
						model: groq("openai/gpt-oss-120b"),
						schema: playlistMetadataSchema,
						prompt: [
							"You are a creative music curator generating a playlist from a cluster of similar tracks.",
							"",
							`Cluster info:`,
							meta ? `Theme: ${meta.themeSummary}` : "",
							meta ? `Mood: ${meta.dominantMood}` : `Top moods: ${[...new Set(moods)].slice(0, 5).join(", ")}`,
							meta ? `Energy: ${meta.dominantEnergy}` : "",
							meta
								? `Archetype: ${meta.suggestedArchetype}`
								: "",
							`Top themes: ${[...new Set(themes)].slice(0, 5).join(", ") || "various"}`,
							`Top vibes: ${[...new Set(vibes)].slice(0, 5).join(", ") || "various"}`,
							`Track count: ${trackRows.length}`,
							`Sample tracks: ${sampleTracks.join("; ")}`,
							"",
							"Generate:",
							"- name: a creative, evocative playlist name (2-4 words, no generic names like 'My Playlist')",
							"- description: 2-3 sentences capturing the feeling and vibe of this playlist",
							"- taxonomy: 'mood' | 'situation' | 'genre' | 'hybrid'",
							"- coverColor: a hex color code that matches the playlist vibe (e.g. '#1a1a2e' for dark moody, '#ff6b6b' for energetic)",
						]
							.filter(Boolean)
							.join("\n"),
					});
					return object;
				},
				{
					retries: 2,
					minTimeout: 2000,
					onFailedAttempt: (error) => {
						logger.warn(
							{ clusterId: c.id, attempt: error.attemptNumber },
							"Playlist metadata generation failed, retrying",
						);
					},
				},
			);

			const [inserted] = await db
				.insert(playlist)
				.values({
					userId,
					name: generated.name,
					aiGeneratedName: generated.name,
					description: generated.description,
					theme: meta?.themeSummary ?? null,
					taxonomy: generated.taxonomy,
					genreDomainId: c.genreDomainId,
					coverColor: generated.coverColor,
					trackCount: trackRows.length,
					isGenerated: true,
					updatedAt: new Date(),
				})
				.returning({ id: playlist.id });

			if (!inserted) continue;

			await db.insert(playlistClusters).values({
				playlistId: inserted.id,
				clusterId: c.id,
				position: 0,
				weight: 1.0,
			});

			const orderedTracks = orderTracksByEnergy(trackRows);

			const trackValues = orderedTracks.map((t, position) => ({
				playlistId: inserted.id,
				trackId: t.id,
				position,
			}));

			if (trackValues.length > 0) {
				const batchSize = 100;
				for (let i = 0; i < trackValues.length; i += batchSize) {
					await db
						.insert(playlistTracks)
						.values(trackValues.slice(i, i + batchSize));
				}
			}

			stats.playlists++;

			if (onProgress) {
				await onProgress(stats);
			}
		} catch (err) {
			logger.error(
				{
					clusterId: c.id,
					error: err instanceof Error ? err.message : String(err),
				},
				"Failed to generate playlist for cluster",
			);
		}
	}

	logger.info(
		{ userId, playlists: stats.playlists },
		"Completed playlist generation",
	);

	return stats;
}

function orderTracksByEnergy(
	tracks: Array<{
		id: string;
		llmTags: unknown;
	}>,
): typeof tracks {
	const energyMap: Record<string, number> = {
		"very low": 1,
		low: 2,
		medium: 3,
		high: 4,
		"very high": 5,
	};

	const withEnergy = tracks.map((t) => {
		const tags = (t.llmTags as Record<string, unknown>) ?? {};
		const level = (tags.energyLevel as string)?.toLowerCase() ?? "medium";
		return { ...t, energyScore: energyMap[level] ?? 3 };
	});

	withEnergy.sort((a, b) => a.energyScore - b.energyScore);

	const n = withEnergy.length;
	if (n <= 2) return withEnergy;

	const result: typeof withEnergy = [];
	const mid = Math.floor(n / 2);

	for (let i = 0; i < n; i++) {
		if (i < mid) {
			result.push(withEnergy[i]!);
		} else {
			result.push(withEnergy[n - 1 - (i - mid)]!);
		}
	}

	return result;
}
