/**
 * Canonical domain types for Harmonia.
 * Use these for type safety; Zod schemas in schemas/ handle validation.
 */

export type {
	ClassifyProgress,
	ClusterProgress,
	EmbedProgress,
	GenerateProgress,
	LyricsProgress,
	PipelineProgress,
	SyncPhase,
	SyncProgress,
} from "./pipeline";
export type { AnalysisSnapshot, LlmTags, TrackAnalysisRow } from "./track";
export { getLlmTags, llmFieldsFromAnalysis } from "./track";
