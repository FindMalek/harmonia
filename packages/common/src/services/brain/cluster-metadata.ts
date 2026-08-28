import {
	getAIModel,
	getModelId,
	getTaskProvider,
	isProviderConfigured,
	withLLMRetry,
} from "@harmonia/ai-provider";
import { clusterMetadataSchema } from "@harmonia/common/schemas";
import { llmFieldsFromAnalysis } from "@harmonia/common/types";
import { db } from "@harmonia/db";
import {
	type ClusterMeta,
	cluster,
	clusterTracks,
} from "@harmonia/db/schema/cluster";
import { track } from "@harmonia/db/schema/track";
import { trackAnalysis } from "@harmonia/db/schema/track-analysis";
import { logger } from "@harmonia/logger";
import { llml } from "@zenbase/llml";
import { APICallError, generateText, Output } from "ai";
import { and, eq, isNull } from "drizzle-orm";
import pLimit from "p-limit";
import { parseJsonStringArray } from "../../utils/parse-json-string-array";
import { logExternalApiCall } from "../external-api-log";

const CLUSTER_METADATA_RETRIES = 2;

export async function generateClusterMetadata(userId: string): Promise<number> {
	if (!isProviderConfigured("clusterMetadata")) {
		logger.warn(
			{
				type: "cluster-metadata",
				provider: getTaskProvider("clusterMetadata"),
			},
			"No credentials configured for the cluster-metadata task's assigned provider; skipping cluster metadata generation",
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
	const limit = pLimit(5);

	await Promise.all(
		clusters.map((c) =>
			limit(async () => {
				const trackRows = await db
					.select({
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
					.where(eq(clusterTracks.clusterId, c.id));

				if (trackRows.length === 0) return;

				const moods: string[] = [];
				const themes: string[] = [];
				const vibes: string[] = [];
				const energyLevels: string[] = [];

				for (const t of trackRows) {
					const { llmMood, llmTags } = llmFieldsFromAnalysis(t);
					if (llmMood) moods.push(llmMood);
					if (llmTags?.themes) themes.push(...llmTags.themes);
					if (llmTags?.vibe) vibes.push(...llmTags.vibe);
					if (llmTags?.energyLevel) energyLevels.push(llmTags.energyLevel);
				}

				const topMoods = topN(moods, 5);
				const topThemes = topN(themes, 5);
				const topVibes = topN(vibes, 5);
				const dominantEnergy = topN(energyLevels, 1)[0] ?? "medium";

				const sampleTracks = trackRows.slice(0, 10).map((t) => {
					const artists = parseJsonStringArray(t.artistNames);
					return `${t.name} by ${artists.join(", ")}`;
				});

				const provider = getTaskProvider("clusterMetadata");
				const modelId = getModelId("clusterMetadata");
				const startTime = Date.now();
				let attempt = 0;
				let usage:
					| Awaited<ReturnType<typeof generateText>>["usage"]
					| undefined;
				try {
					const meta = await withLLMRetry(
						async (attemptCount) => {
							attempt = attemptCount - 1;
							const { output, usage: callUsage } = await generateText({
								model: getAIModel("clusterMetadata"),
								output: Output.object({ schema: clusterMetadataSchema }),
								temperature: 0,
								prompt: llml({
									role: "You are analyzing a cluster of similar music tracks. Based on the aggregate characteristics below, generate metadata for this cluster.",
									clusterInfo: {
										size: `${trackRows.length} tracks`,
										topMoods: topMoods.join(", "),
										topThemes: topThemes.join(", "),
										topVibes: topVibes.join(", "),
										dominantEnergy,
										sampleTracks: sampleTracks.join("; "),
									},
									generate: [
										"themeSummary: a concise 1-sentence description of this cluster's musical identity",
										"dominantMood: the single most representative mood",
										"dominantEnergy: very low | low | medium | high | very high",
										"topThemes: 3-5 key themes",
										"topVibes: 3-5 situational descriptors",
										"suggestedArchetype: mood | situation | genre | hybrid",
									],
								}),
							});
							usage = callUsage;
							return output;
						},
						{
							retries: CLUSTER_METADATA_RETRIES,
							minTimeout: 2000,
							label: `cluster-metadata:${c.id}`,
						},
					);

					await db
						.update(cluster)
						.set({ metadata: meta as ClusterMeta })
						.where(eq(cluster.id, c.id));

					await logExternalApiCall({
						userId,
						provider,
						endpoint: modelId,
						method: "POST",
						httpStatus: 200,
						requestPayload: { model: modelId, clusterId: c.id },
						responsePayload: { usage },
						durationMs: Date.now() - startTime,
						retryAttempt: attempt,
					});

					generated++;
				} catch (err) {
					logger.error(
						{
							clusterId: c.id,
							error: err instanceof Error ? err.message : String(err),
						},
						"Failed to generate cluster metadata",
					);
					const httpStatus = APICallError.isInstance(err)
						? err.statusCode
						: undefined;
					await logExternalApiCall({
						userId,
						provider,
						endpoint: modelId,
						method: "POST",
						httpStatus,
						requestPayload: { model: modelId, clusterId: c.id },
						responsePayload: usage != null ? { usage } : undefined,
						durationMs: Date.now() - startTime,
						errorMessage: err instanceof Error ? err.message : String(err),
						statusCategory: httpStatus ? undefined : "server_error",
						retryAttempt: attempt,
					});
				}
			}),
		),
	);

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
