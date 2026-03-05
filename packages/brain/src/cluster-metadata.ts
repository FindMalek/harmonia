import { createOpenAI } from "@ai-sdk/openai";
import { db } from "@harmonia/db";
import {
	cluster,
	type ClusterMeta,
	clusterTracks,
} from "@harmonia/db/schema/cluster";
import { track } from "@harmonia/db/schema/track";
import { env } from "@harmonia/env/server";
import { logger } from "@harmonia/logger";
import { generateObject } from "ai";
import { and, eq, isNull } from "drizzle-orm";
import pRetry from "p-retry";

import { clusterMetadataSchema } from "./schemas";

const groq = createOpenAI({
	apiKey: env.GROQ_API_KEY,
	baseURL: "https://api.groq.com/openai/v1",
});

export async function generateClusterMetadata(userId: string): Promise<number> {
	if (!env.GROQ_API_KEY) {
		logger.warn(
			{},
			"No GROQ_API_KEY configured; skipping cluster metadata generation",
		);
		return 0;
	}

	const clusters = await db
		.select()
		.from(cluster)
		.where(and(eq(cluster.userId, userId), isNull(cluster.metadata)));

	if (clusters.length === 0) {
		logger.info({ userId }, "All clusters already have metadata");
		return 0;
	}

	let generated = 0;

	for (const c of clusters) {
		const trackRows = await db
			.select({
				name: track.name,
				artistNames: track.artistNames,
				llmMood: track.llmMood,
				llmTags: track.llmTags,
			})
			.from(clusterTracks)
			.innerJoin(track, eq(track.id, clusterTracks.trackId))
			.where(eq(clusterTracks.clusterId, c.id));

		if (trackRows.length === 0) continue;

		const moods: string[] = [];
		const themes: string[] = [];
		const vibes: string[] = [];
		const energyLevels: string[] = [];

		for (const t of trackRows) {
			if (t.llmMood) moods.push(t.llmMood);
			const tags = (t.llmTags as Record<string, unknown>) ?? {};
			const tThemes = tags.themes as string[] | undefined;
			const tVibes = tags.vibe as string[] | undefined;
			const tEnergy = tags.energyLevel as string | undefined;
			if (tThemes) themes.push(...tThemes);
			if (tVibes) vibes.push(...tVibes);
			if (tEnergy) energyLevels.push(tEnergy);
		}

		const topMoods = topN(moods, 5);
		const topThemes = topN(themes, 5);
		const topVibes = topN(vibes, 5);
		const dominantEnergy = topN(energyLevels, 1)[0] ?? "medium";

		const sampleTracks = trackRows.slice(0, 10).map((t) => {
			const artists = JSON.parse(t.artistNames) as string[];
			return `${t.name} by ${artists.join(", ")}`;
		});

		try {
			const meta = await pRetry(
				async () => {
					const { object } = await generateObject({
						model: groq("openai/gpt-oss-120b"),
						schema: clusterMetadataSchema,
						prompt: [
							"You are analyzing a cluster of similar music tracks. Based on the aggregate characteristics below, generate metadata for this cluster.",
							"",
							`Cluster size: ${trackRows.length} tracks`,
							`Top moods: ${topMoods.join(", ")}`,
							`Top themes: ${topThemes.join(", ")}`,
							`Top vibes: ${topVibes.join(", ")}`,
							`Dominant energy: ${dominantEnergy}`,
							`Sample tracks: ${sampleTracks.join("; ")}`,
							"",
							"Generate:",
							"- themeSummary: a concise 1-sentence description of this cluster's musical identity",
							"- dominantMood: the single most representative mood",
							"- dominantEnergy: 'very low', 'low', 'medium', 'high', or 'very high'",
							"- topThemes: 3-5 key themes",
							"- topVibes: 3-5 situational descriptors",
							"- suggestedArchetype: 'mood' | 'situation' | 'genre' | 'hybrid'",
						].join("\n"),
					});
					return object;
				},
				{
					retries: 2,
					minTimeout: 2000,
					onFailedAttempt: (error) => {
						logger.warn(
							{ clusterId: c.id, attempt: error.attemptNumber },
							"Cluster metadata generation failed, retrying",
						);
					},
				},
			);

			await db
				.update(cluster)
				.set({ metadata: meta as ClusterMeta })
				.where(eq(cluster.id, c.id));

			generated++;
		} catch (err) {
			logger.error(
				{
					clusterId: c.id,
					error: err instanceof Error ? err.message : String(err),
				},
				"Failed to generate cluster metadata",
			);
		}
	}

	logger.info({ userId, generated }, "Completed cluster metadata generation");
	return generated;
}

function topN(items: string[], n: number): string[] {
	const counts = new Map<string, number>();
	for (const item of items) {
		const lower = item.toLowerCase();
		counts.set(lower, (counts.get(lower) ?? 0) + 1);
	}
	return Array.from(counts.entries())
		.sort((a, b) => b[1] - a[1])
		.slice(0, n)
		.map(([item]) => item);
}
