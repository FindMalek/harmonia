/**
 * Canonical LLM tags shape from our classifier.
 * Matches DB schema (track.llmTags) and is used across embeddings, clustering, playlist generation.
 */
export type LlmTags = {
	secondaryMoods: string[];
	themes: string[];
	topics: string[];
	vibe: string[];
	vocalType: string;
	energyLevel: string;
	language: string;
	era: string;
};

/**
 * Safely parse llmTags from DB (may be null or malformed).
 * Returns a partial shape for type-safe access in services.
 */
export function getLlmTags(value: unknown): Partial<LlmTags> {
	if (!value || typeof value !== "object") return {};
	const t = value as Record<string, unknown>;
	return {
		secondaryMoods: Array.isArray(t.secondaryMoods)
			? (t.secondaryMoods as string[])
			: [],
		themes: Array.isArray(t.themes) ? (t.themes as string[]) : [],
		topics: Array.isArray(t.topics) ? (t.topics as string[]) : [],
		vibe: Array.isArray(t.vibe) ? (t.vibe as string[]) : [],
		vocalType: typeof t.vocalType === "string" ? t.vocalType : "",
		energyLevel: typeof t.energyLevel === "string" ? t.energyLevel : "",
		language: typeof t.language === "string" ? t.language : "",
		era: typeof t.era === "string" ? t.era : "",
	};
}

/**
 * Full analysis snapshot stored for audit/debug.
 * Matches DB schema (track.analysisSnapshot).
 */
export type AnalysisSnapshot = {
	llm: Record<string, unknown>;
	domain: string | null;
	embeddingDims?: number;
	modelVersions?: { llm?: string; embedding?: string };
};

/** Flat shape of a joined track_analysis row, as selected by read-path queries. */
export type TrackAnalysisRow = {
	mood: string | null;
	secondaryMoods: string[] | null;
	themes: string[] | null;
	topics: string[] | null;
	vibe: string[] | null;
	vocalType: string | null;
	energyLevel: string | null;
	language: string | null;
	era: string | null;
	classifiedAt: Date | null;
};

/**
 * Reconstructs the legacy llmMood/llmTags/llmClassifiedAt shape from a
 * LEFT JOINed track_analysis row (null classifiedAt means no join match,
 * i.e. not yet classified). Keeps output schemas/consumers unchanged after
 * moving classification storage off the track table (#113).
 */
export function llmFieldsFromAnalysis(
	row: TrackAnalysisRow | null | undefined,
) {
	if (!row || row.classifiedAt === null) {
		return { llmMood: null, llmTags: null, llmClassifiedAt: null };
	}
	return {
		llmMood: row.mood,
		llmTags: {
			secondaryMoods: row.secondaryMoods ?? [],
			themes: row.themes ?? [],
			topics: row.topics ?? [],
			vibe: row.vibe ?? [],
			vocalType: row.vocalType ?? "",
			energyLevel: row.energyLevel ?? "",
			language: row.language ?? "",
			era: row.era ?? "",
		} satisfies LlmTags,
		llmClassifiedAt: row.classifiedAt,
	};
}
