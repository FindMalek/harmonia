/**
 * Cross-stage degradation thresholds.
 *
 * The pipeline orchestrator uses these to decide whether a run that did not
 * throw should still be reported as `partial` (finished, but with significant
 * data loss) instead of `completed`. See `trigger/tasks/organize.ts`.
 *
 * Thresholds are expressed as a ratio of `done / total` for the work that was
 * *pending at the start of this run*. A re-run that has nothing pending
 * (total === 0) is never flagged — a healthy no-op.
 */
export const PIPELINE_PARTIAL_CLASSIFY_THRESHOLD = 0.5;
export const PIPELINE_PARTIAL_EMBED_THRESHOLD = 0.5;
