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
 *
 * Pure, no I/O — kept in its own module (rather than inline in organize.ts)
 * specifically so it's testable without importing the whole Trigger.dev task
 * graph, same reasoning as clustering.ts's exported mergeSmallClusters/
 * splitLargeClusters/kmeans.
 */
export function assessRunOutcome(args: {
	classify: { classified: number; total: number } | undefined;
	embed: { embedded: number; total: number } | undefined;
	cluster: { clusters: number; totalTracks: number } | undefined;
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

	// Independent of this run's classify/embed deltas (both are 0 on any re-run
	// of an already-fully-processed library) — catches a run that had embedded
	// tracks to work with but DBSCAN found no dense-enough group among them,
	// which the classify/embed coverage checks above can never see (#282).
	const cluster = args.cluster;
	const clusterProducedNothing =
		!!cluster && cluster.totalTracks > 0 && cluster.clusters === 0;
	if (clusterProducedNothing) {
		reasons.push(
			`no groups could be formed from your library (${cluster.totalTracks} tracks analyzed) — it may be too small or too musically diverse for automatic grouping yet`,
		);
	}

	const generate = args.generate;
	if (
		generate &&
		generate.playlists === 0 &&
		classify !== undefined &&
		classify.classified > 0 &&
		!clusterProducedNothing
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
