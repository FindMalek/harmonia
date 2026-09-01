import { getLlmTags } from "@sonaraem/common/types";

export function buildEmbeddingInput(track: {
	llmMood: string | null;
	llmTags: unknown;
}): string | null {
	const tags = getLlmTags(track.llmTags);
	const parts: string[] = [];

	if (track.llmMood) parts.push(`Mood: ${track.llmMood}`);
	if (tags.secondaryMoods?.length)
		parts.push(`Secondary moods: ${tags.secondaryMoods.join(", ")}`);
	if (tags.themes?.length) parts.push(`Themes: ${tags.themes.join(", ")}`);
	if (tags.topics?.length) parts.push(`Topics: ${tags.topics.join(", ")}`);
	if (tags.vibe?.length) parts.push(`Vibe: ${tags.vibe.join(", ")}`);
	if (tags.vocalType) parts.push(`Vocal: ${tags.vocalType}`);
	if (tags.energyLevel) parts.push(`Energy: ${tags.energyLevel}`);
	if (tags.language) parts.push(`Language: ${tags.language}`);
	if (tags.era) parts.push(`Era: ${tags.era}`);

	if (parts.length === 0) return null;
	return parts.join(" | ");
}
