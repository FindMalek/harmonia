import { db } from "@harmonia/db";
import { track } from "@harmonia/db/schema/track";
import { env } from "@harmonia/env/server";
import { logger } from "@harmonia/logger";
import { and, eq, isNull } from "drizzle-orm";

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_BATCH_SIZE = 64;

type OpenAIEmbeddingResponse = {
	data: Array<{
		embedding: number[];
	}>;
};

export async function embedTracksBatch(userId: string): Promise<void> {
	if (!env.OPENAI_API_KEY) {
		logger.warn(
			{},
			"No OPENAI_API_KEY configured; skipping embedding generation",
		);
		return;
	}

	const pendingTracks = await db
		.select()
		.from(track)
		.where(and(eq(track.userId, userId), isNull(track.embedding)))
		.limit(EMBEDDING_BATCH_SIZE);

	if (pendingTracks.length === 0) {
		logger.info({ userId }, "No tracks pending embedding generation");
		return;
	}

	logger.info(
		{ userId, count: pendingTracks.length },
		"Starting embedding batch for tracks",
	);

	const inputs = pendingTracks.map((t) => {
		const artistNames: string[] = JSON.parse(t.artistNames) ?? [];
		const tags = t.llmTags ?? {
			secondaryMoods: [],
			themes: [],
			vocalType: "",
			energyLevel: "",
		};

		const parts = [
			`Title: ${t.name}`,
			`Artists: ${artistNames.join(", ")}`,
		];

		if (t.albumName) {
			parts.push(`Album: ${t.albumName}`);
		}

		if (t.llmMood) {
			parts.push(`Mood: ${t.llmMood}`);
		}

		if (tags.secondaryMoods?.length) {
			parts.push(`Secondary moods: ${tags.secondaryMoods.join(", ")}`);
		}

		if (tags.themes?.length) {
			parts.push(`Themes: ${tags.themes.join(", ")}`);
		}

		if (tags.vocalType) {
			parts.push(`Vocal: ${tags.vocalType}`);
		}

		if (tags.energyLevel) {
			parts.push(`Energy: ${tags.energyLevel}`);
		}

		const text = parts.join(" | ");

		return {
			id: t.id,
			text,
		};
	});

	const response = await fetch("https://api.openai.com/v1/embeddings", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${env.OPENAI_API_KEY}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			model: EMBEDDING_MODEL,
			input: inputs.map((i) => i.text),
		}),
	});

	if (!response.ok) {
		logger.error(
			{ status: response.status, statusText: response.statusText },
			"OpenAI embeddings request failed",
		);
		return;
	}

	const json = (await response.json()) as OpenAIEmbeddingResponse;

	if (!json.data || json.data.length !== inputs.length) {
		logger.error(
			{ expected: inputs.length, actual: json.data?.length },
			"Embedding response length mismatch",
		);
		return;
	}

	const now = new Date();

	for (let index = 0; index < inputs.length; index++) {
		const input = inputs[index];
		const embedding = json.data[index]?.embedding;

		if (!embedding) continue;

		await db
			.update(track)
			.set({
				embedding,
				embeddingGeneratedAt: now,
				embeddingInput: input.text,
				analysisSnapshot: {
					llm: null,
					domain: null,
					embeddingDims: embedding.length,
					modelVersions: {
						embedding: EMBEDDING_MODEL,
					},
				},
			})
			.where(and(eq(track.userId, userId), eq(track.id, input.id)));
	}

	logger.info(
		{ userId, count: inputs.length },
		"Completed embedding batch for tracks",
	);
}

