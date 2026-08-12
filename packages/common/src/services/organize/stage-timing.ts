import type { PipelineProgress } from "@harmonia/common/types";
import { db } from "@harmonia/db";
import { pipelineStageTiming } from "@harmonia/db/schema/pipeline-run";
import { logger } from "@harmonia/logger";
import { and, gt, inArray, isNotNull, sql } from "drizzle-orm";

// Fixed run order organizePipeline actually executes stages in (#283) — `artists`
// runs fire-and-forget alongside `sync` and never gates the run, so it's excluded.
const STAGE_ORDER = [
	"sync",
	"lyrics",
	"classify",
	"embed",
	"cluster",
	"generate",
	"match",
	"export",
] as const;
type StageId = (typeof STAGE_ORDER)[number];

// Stages with a track count that scales duration roughly linearly — estimated
// as seconds-per-track. Everything else (no clean per-item cost model) is
// estimated as a flat historical duration instead.
const PER_TRACK_STAGES = new Set<StageId>(["lyrics", "classify", "embed"]);

// Cold-start fallback (used only until real historical rows exist for a
// stage) — ballpark figures from each stage's batch/concurrency constants,
// not measured. classify (Groq LLM, concurrency 1) is the slowest per-track;
// embed (OpenAI, batched 256 at a time) the fastest. sync's real cost model
// is playlist/liked-song-count dependent, not track-count-linear (#284) —
// this flat seed is a rough placeholder until enough real runs replace it.
const FALLBACK_SECONDS: Record<StageId, number> = {
	sync: 20,
	lyrics: 0.4,
	classify: 2,
	embed: 0.05,
	cluster: 5,
	generate: 15,
	match: 5,
	export: 10,
};

export type StageRate = { kind: "per_track" | "flat"; secondsPerUnit: number };

/** Persists one stage's real wall-clock duration for future ETA estimates. Never throws — a failed write shouldn't fail the pipeline. */
export async function recordStageTiming(
	runId: number,
	stage: string,
	startedAt: Date,
	trackCount: number | null,
): Promise<void> {
	try {
		await db.insert(pipelineStageTiming).values({
			runId,
			stage,
			trackCount,
			startedAt,
			completedAt: new Date(),
		});
	} catch (err) {
		logger.warn(
			{ runId, stage, error: err instanceof Error ? err.message : String(err) },
			"Failed to record stage timing",
		);
	}
}

/** One query per cost model (per-track vs flat), averaged across every historical run — not scoped per-user, so a young product converges on real data faster. */
export async function getHistoricalStageRates(): Promise<
	Map<string, StageRate>
> {
	const rates = new Map<string, StageRate>();

	const perTrackStageList = [...PER_TRACK_STAGES];
	const perTrackRows = await db
		.select({
			stage: pipelineStageTiming.stage,
			avgSecondsPerTrack: sql<string>`avg(extract(epoch from (${pipelineStageTiming.completedAt} - ${pipelineStageTiming.startedAt})) / nullif(${pipelineStageTiming.trackCount}, 0))`,
		})
		.from(pipelineStageTiming)
		.where(
			and(
				inArray(pipelineStageTiming.stage, perTrackStageList),
				isNotNull(pipelineStageTiming.trackCount),
				gt(pipelineStageTiming.trackCount, 0),
			),
		)
		.groupBy(pipelineStageTiming.stage);

	for (const row of perTrackRows) {
		const value = Number(row.avgSecondsPerTrack);
		if (Number.isFinite(value) && value > 0) {
			rates.set(row.stage, { kind: "per_track", secondsPerUnit: value });
		}
	}

	const flatStageList = STAGE_ORDER.filter((s) => !PER_TRACK_STAGES.has(s));
	const flatRows = await db
		.select({
			stage: pipelineStageTiming.stage,
			avgSeconds: sql<string>`avg(extract(epoch from (${pipelineStageTiming.completedAt} - ${pipelineStageTiming.startedAt})))`,
		})
		.from(pipelineStageTiming)
		.where(inArray(pipelineStageTiming.stage, flatStageList))
		.groupBy(pipelineStageTiming.stage);

	for (const row of flatRows) {
		const value = Number(row.avgSeconds);
		if (Number.isFinite(value) && value > 0) {
			rates.set(row.stage, { kind: "flat", secondsPerUnit: value });
		}
	}

	return rates;
}

function rateFor(
	stage: StageId,
	historical: Map<string, StageRate>,
): StageRate {
	return (
		historical.get(stage) ?? {
			kind: PER_TRACK_STAGES.has(stage) ? "per_track" : "flat",
			secondsPerUnit: FALLBACK_SECONDS[stage],
		}
	);
}

/**
 * Pure — no I/O. Sums remaining time in the current stage plus every stage
 * still ahead, using historical rates (falling back to hardcoded ones per
 * stage where there's no history yet). Returns null when there isn't enough
 * signal to estimate honestly rather than showing a misleading number —
 * specifically, before the sync stage has reported the library's track count
 * (the proxy used for every later per-track stage's remaining work).
 */
export function estimateRemainingSeconds(args: {
	currentStage: string | null;
	progress: PipelineProgress;
	historicalRates: Map<string, StageRate>;
}): number | null {
	const { currentStage, progress, historicalRates } = args;
	if (!currentStage) return null;

	const currentIndex = STAGE_ORDER.indexOf(currentStage as StageId);
	if (currentIndex === -1) return null;

	const libraryTrackCount = progress.sync?.total ?? 0;
	if (libraryTrackCount === 0 && currentStage !== "sync") return null;

	let totalSeconds = 0;

	const currentStageId = STAGE_ORDER[currentIndex] as StageId;
	const currentRate = rateFor(currentStageId, historicalRates);
	if (currentRate.kind === "per_track") {
		const stageProgress = progressForStage(progress, currentStageId);
		const total = stageProgress?.total ?? libraryTrackCount;
		const processed = stageProgress?.processed ?? 0;
		totalSeconds += Math.max(0, total - processed) * currentRate.secondsPerUnit;
	} else if (currentStageId !== "sync" || libraryTrackCount > 0) {
		// No live sub-progress signal for flat stages — assume half-remaining as
		// the least-wrong guess available without per-item progress to measure.
		totalSeconds += currentRate.secondsPerUnit * 0.5;
	} else {
		// Still in sync, library size unknown yet — its own remaining time is
		// the only thing estimable at all right now.
		totalSeconds += currentRate.secondsPerUnit * 0.5;
	}

	for (let i = currentIndex + 1; i < STAGE_ORDER.length; i++) {
		const stageId = STAGE_ORDER[i] as StageId;
		const rate = rateFor(stageId, historicalRates);
		totalSeconds +=
			rate.kind === "per_track"
				? libraryTrackCount * rate.secondsPerUnit
				: rate.secondsPerUnit;
	}

	return Math.round(totalSeconds);
}

function progressForStage(
	progress: PipelineProgress,
	stage: StageId,
): { total: number; processed: number } | null {
	switch (stage) {
		case "lyrics":
			return progress.lyrics
				? { total: progress.lyrics.total, processed: progress.lyrics.processed }
				: null;
		case "classify":
			return progress.classify
				? {
						total: progress.classify.total,
						processed: progress.classify.classified,
					}
				: null;
		case "embed":
			return progress.embed
				? { total: progress.embed.total, processed: progress.embed.embedded }
				: null;
		default:
			return null;
	}
}
