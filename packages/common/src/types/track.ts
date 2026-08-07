// Mirrors DB schema's track.llmTags column shape.
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

// Mirrors DB schema's track.analysisSnapshot column shape.
export type AnalysisSnapshot = {
	llm: Record<string, unknown>;
	domain: string | null;
	embeddingDims?: number;
	modelVersions?: { llm?: string; embedding?: string };
};
