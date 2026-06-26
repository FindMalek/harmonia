import { logger } from "@harmonia/logger";
import { task } from "@trigger.dev/sdk";
import {
	PIPELINE_PARTIAL_CLASSIFY_THRESHOLD,
	PIPELINE_PARTIAL_EMBED_THRESHOLD,
} from "../../constants";

import { PipelineCancelledError, updateRun } from "../../services/organize";
import { sendOrganizeCompleteEmailTask } from "./emails/send-organize-complete";
import { classifyStageTask } from "./stages/classify";
import { clusterStageTask } from "./stages/cluster";
import { embedStageTask } from "./stages/embed";
import { generateStageTask } from "./stages/generate";
import { lyricsStageTask } from "./stages/lyrics";
import { matchStageTask } from "./stages/match";
import { syncStageTask } from "./stages/sync";

type OrganizeRunStatus = "completed" | "partial" | "failed" | "cancelled";

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
}): { status: "completed" | "partial"; error: string | null } {
	const reasons: string[] = [];

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
					? "embedding failed (0 of pending tracks compared)"
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

			await syncStageTask.triggerAndWait({ userId, runId });
			await lyricsStageTask.triggerAndWait({ userId, runId });
			const classifyRun = await classifyStageTask.triggerAndWait({
				userId,
				runId,
			});
			const embedRun = await embedStageTask.triggerAndWait({
				userId,
				runId,
			});
			await clusterStageTask.triggerAndWait({ userId, runId });
			const generateRun = await generateStageTask.triggerAndWait({
				userId,
				runId,
			});
			await matchStageTask.triggerAndWait({ userId, runId });

			const outcome = assessRunOutcome({
				classify: classifyRun.ok ? classifyRun.output : undefined,
				embed: embedRun.ok ? embedRun.output : undefined,
				generate: generateRun.ok ? generateRun.output : undefined,
			});

			await updateRun(runId, {
				status: outcome.status,
				currentStage: null,
				completedAt: new Date(),
				...(outcome.error !== null && { error: outcome.error }),
			});

			if (outcome.status === "partial") {
				logger.warn(
					{ userId, runId, error: outcome.error },
					"Organize pipeline completed in a degraded (partial) state",
				);
			}

			try {
				await sendOrganizeCompleteEmailTask.trigger({
					userId,
					runId,
				});
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
