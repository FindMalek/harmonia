/**
 * Canonical domain types for Harmonia.
 * Use these for type safety; Zod schemas in schemas/ handle validation.
 */

export type {
	AudioFeaturesProgress,
	ClassifyProgress,
	ClusterProgress,
	EmbedProgress,
	GenerateProgress,
	LyricsProgress,
	PipelineProgress,
	SyncPhase,
	SyncProgress,
} from "./pipeline";
export type { AnalysisSnapshot, LlmTags } from "./track";
export { getLlmTags } from "./track";
