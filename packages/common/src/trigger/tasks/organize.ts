import { logger } from "@harmonia/logger";
import { task } from "@trigger.dev/sdk";

import {
	PipelineCancelledError,
	recordStageTiming,
	updateRun,
} from "../../services/organize";
import { sendOrganizeCompleteEmailTask } from "./emails/send-organize-complete";
import { artistsStageTask } from "./stages/artists";
import { classifyStageTask } from "./stages/classify";
import { clusterStageTask } from "./stages/cluster";
import { embedStageTask } from "./stages/embed";
import { exportStageTask } from "./stages/export";
import { generateStageTask } from "./stages/generate";
import { lyricsStageTask } from "./stages/lyrics";
import { matchStageTask } from "./stages/match";
import { syncStageTask } from "./stages/sync";

type OrganizeRunStatus = "completed" | "partial" | "failed" | "cancelled";

// Ratio of done/total (work pending at run start) below which a non-throwing run is still reported "partial"; total===0 never flags.
const PIPELINE_PARTIAL_CLASSIFY_THRESHOLD = 0.5;
const PIPELINE_PARTIAL_EMBED_THRESHOLD = 0.5;

/**
 * Decide whether a run that completed every stage without throwing still
 * achieved a useful outcome. Returns `partial` with a human-readable reason
 * when a cross-stage gate trips, otherwise `completed`.
 *
 * Intentionally does NOT throw — downstream stages already no-op gracefully
 * when an upstream stage left nothing behind. We only surface the degraded
 * outcome so the run is not reported as a clean success.
 */
function assessRunOutcome(args: {
	classify: { classified: number; total: number } | undefined;
	embed: { embedded: number; total: number } | undefined;
	generate: { playlists: number; tracksOrganized: number } | undefined;
	/** Stage coordinator tasks that resolved with `ok: false` (exhausted retries). */
	stageFailures: readonly string[];
}): { status: "completed" | "partial"; error: string | null } {
	const reasons: string[] = [];

	// A stage that hard-failed (returned ok:false without throwing) is always
	// degraded, regardless of the coverage numbers — otherwise a failed stage
	// could be surfaced as a clean success.
	if (args.stageFailures.length > 0) {
		reasons.push(`stage failure: ${args.stageFailures.join(", ")}`);
	}

	const classify = args.classify;
	if (classify && classify.total > 0) {
		const coverage = classify.classified / classify.total;
		if (coverage < PIPELINE_PARTIAL_CLASSIFY_THRESHOLD) {
			const pct = Math.round(coverage * 100);
			reasons.push(
				classify.classified === 0
					? `classification failed (0 of ${classify.total} pending tracks tagged)`
					: `only ${pct}% of pending tracks were classified`,
			);
		}
	}

	const embed = args.embed;
	if (embed && embed.total > 0) {
		const coverage = embed.embedded / embed.total;
		if (coverage < PIPELINE_PARTIAL_EMBED_THRESHOLD) {
			const pct = Math.round(coverage * 100);
			reasons.push(
				embed.embedded === 0
					? `embedding failed (0 of ${embed.total} classified tracks compared)`
					: `only ${pct}% of classified tracks were embedded`,
			);
		}
	}

	const generate = args.generate;
	if (
		generate &&
		generate.playlists === 0 &&
		classify !== undefined &&
		classify.classified > 0
	) {
		reasons.push("no playlists were generated despite classified tracks");
	}

	if (reasons.length === 0) {
		return { status: "completed", error: null };
	}

	return {
		status: "partial",
		error: `Pipeline completed with reduced coverage — ${reasons.join("; ")}. Re-running recommended.`,
	};
}

export const organizePipeline = task({
	id: "organize-pipeline",
	retry: { maxAttempts: 1 },
	run: async ({
		userId,
		runId,
	}: {
		userId: string;
		runId: number;
	}): Promise<{
		userId: string;
		runId: number;
		status: OrganizeRunStatus;
		error?: string;
	}> => {
		try {
			await updateRun(runId, { status: "running", startedAt: new Date() });

			// Real wall-clock duration per stage feeds the ETA estimate shown in
			// the dashboard (#283) — recorded here, once per stage, rather than
			// inside each stage task, so every stage's timing lives in one place.
			const syncStart = new Date();
			const syncRun = await syncStageTask.triggerAndWait({ userId, runId });
			await recordStageTiming(
				runId,
				"sync",
				syncStart,
				syncRun.ok ? syncRun.output.total : null,
			);

			try {
				// Cosmetic enrichment — fire-and-forget, doesn't gate the run's outcome.
				await artistsStageTask.trigger({ userId, runId });
			} catch (artistsErr) {
				logger.warn(
					{
						userId,
						runId,
						error:
							artistsErr instanceof Error
								? artistsErr.message
								: String(artistsErr),
					},
					"Failed to queue artist image fetch task",
				);
			}

			const lyricsStart = new Date();
			const lyricsRun = await lyricsStageTask.triggerAndWait({
				userId,
				runId,
			});
			await recordStageTiming(
				runId,
				"lyrics",
				lyricsStart,
				lyricsRun.ok ? lyricsRun.output.total : null,
			);

			const classifyStart = new Date();
			const classifyRun = await classifyStageTask.triggerAndWait({
				userId,
				runId,
			});
			await recordStageTiming(
				runId,
				"classify",
				classifyStart,
				classifyRun.ok ? classifyRun.output.total : null,
			);

			const embedStart = new Date();
			const embedRun = await embedStageTask.triggerAndWait({
				userId,
				runId,
			});
			await recordStageTiming(
				runId,
				"embed",
				embedStart,
				embedRun.ok ? embedRun.output.total : null,
			);

			const clusterStart = new Date();
			const clusterRun = await clusterStageTask.triggerAndWait({
				userId,
				runId,
			});
			await recordStageTiming(runId, "cluster", clusterStart, null);

			const generateStart = new Date();
			const generateRun = await generateStageTask.triggerAndWait({
				userId,
				runId,
			});
			await recordStageTiming(runId, "generate", generateStart, null);

			const matchStart = new Date();
			const matchRun = await matchStageTask.triggerAndWait({
				userId,
				runId,
			});
			await recordStageTiming(runId, "match", matchStart, null);

			// Only playlists actually touched this run (created/updated by
			// generate, or appended to by match) are candidates for auto-export —
			// autoExportUpdatedPlaylists further restricts this to playlists the
			// user has already manually exported at least once.
			const touchedPlaylistIds = [
				...new Set([
					...(generateRun.ok ? generateRun.output.updatedPlaylistIds : []),
					...(matchRun.ok ? matchRun.output.touchedPlaylistIds : []),
				]),
			];
			const exportStart = new Date();
			const exportRun = await exportStageTask.triggerAndWait({
				userId,
				runId,
				playlistIds: touchedPlaylistIds,
			});
			await recordStageTiming(runId, "export", exportStart, null);

			// Any stage that resolved with ok:false (exhausted retries, no
			// throw) is a hard failure of the run and must not be surfaced as
			// a clean success.
			const stageFailures: string[] = [];
			if (!syncRun.ok) stageFailures.push("sync");
			if (!lyricsRun.ok) stageFailures.push("lyrics");
			if (!classifyRun.ok) stageFailures.push("classify");
			if (!embedRun.ok) stageFailures.push("embed");
			if (!clusterRun.ok) stageFailures.push("cluster");
			if (!generateRun.ok) stageFailures.push("generate");
			if (!matchRun.ok) stageFailures.push("match");
			if (!exportRun.ok) stageFailures.push("export");

			const outcome = assessRunOutcome({
				classify: classifyRun.ok ? classifyRun.output : undefined,
				embed: embedRun.ok ? embedRun.output : undefined,
				generate: generateRun.ok ? generateRun.output : undefined,
				stageFailures,
			});

			await updateRun(runId, {
				status: outcome.status,
				currentStage: null,
				completedAt: new Date(),
				error: outcome.error,
			});

			if (outcome.status === "partial") {
				logger.warn(
					{ userId, runId, error: outcome.error },
					"Organize pipeline completed in a degraded (partial) state",
				);
			}

			try {
				// Only notify on a clean completion — a partial run is not a
				// success and should not trigger the "completed successfully"
				// email (a degraded-run notification is a separate concern).
				if (outcome.status === "completed") {
					await sendOrganizeCompleteEmailTask.trigger({
						userId,
						runId,
					});
				}
			} catch (emailErr) {
				logger.warn(
					{
						userId,
						runId,
						error:
							emailErr instanceof Error ? emailErr.message : String(emailErr),
					},
					"Failed to queue organize completion email task",
				);
			}

			return {
				userId,
				runId,
				status: outcome.status,
				error: outcome.error ?? undefined,
			};
		} catch (err) {
			if (err instanceof PipelineCancelledError) {
				await updateRun(runId, {
					status: "cancelled",
					completedAt: new Date(),
				});
				return { userId, runId, status: "cancelled" };
			}
			const error = err instanceof Error ? err.message : String(err);
			await updateRun(runId, {
				status: "failed",
				error,
				completedAt: new Date(),
			});
			return { userId, runId, status: "failed", error };
		}
	},
});
