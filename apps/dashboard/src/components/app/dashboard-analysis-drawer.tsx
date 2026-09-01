"use client";

import {
	Alert,
	AlertDescription,
	Button,
	Drawer,
	DrawerContent,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	Icons,
	Progress,
	ScrollArea,
} from "@sonaraem/ui";
import { cn } from "@/lib/utils";
import { useOrganizeController } from "@/shared/lib/organize/controller.hook";
import { usePipelineProgress } from "@/shared/lib/pipeline/controller.hook";
import type {
	PipelineProgressStage,
	PipelineRunStatus,
} from "@/shared/lib/pipeline/types";

const STAGES = [
	{ id: "sync", label: "Syncing library" },
	{ id: "lyrics", label: "Collecting lyrics" },
	{ id: "classify", label: "Tagging tracks" },
	{ id: "embed", label: "Comparing tracks" },
	{ id: "cluster", label: "Grouping tracks" },
	{ id: "generate", label: "Generating playlists" },
] as const;

type StageId = (typeof STAGES)[number]["id"];

/** Stages that produce measurable output — used to flag no-op stages on a partial run. */
function stageProducedNothing(
	stageId: StageId,
	progress: Record<string, PipelineProgressStage> | undefined,
): boolean {
	const prog = progress?.[stageId];
	switch (stageId) {
		// total===0 means nothing was pending (already done in an earlier run) —
		// a healthy outcome, not a stage that failed to produce anything (#282).
		case "classify":
			return !!prog?.total && !prog?.classified;
		case "embed":
			return !!prog?.total && !prog?.embedded;
		case "cluster":
			return !!prog?.totalTracks && !prog?.clusters;
		case "generate":
			return !prog?.playlists && !prog?.tracksOrganized;
		default:
			return false;
	}
}

/** Coarse rounding on purpose — a raw "3m 14s" implies more precision than a best-effort estimate actually has (#283). */
function formatEtaSeconds(seconds: number): string {
	if (seconds < 60) return "Less than a minute remaining";
	const minutes = Math.round(seconds / 60);
	if (minutes < 60) {
		return minutes === 1
			? "About 1 minute remaining"
			: `About ${minutes} minutes remaining`;
	}
	const hours = Math.round(minutes / 60);
	return hours === 1
		? "About 1 hour remaining"
		: `About ${hours} hours remaining`;
}

export function DashboardAnalysisDrawer() {
	const {
		isAnalysisDrawerOpen,
		setIsAnalysisDrawerOpen,
		activeRunId,
		cancelMutation,
		organizeMutation,
	} = useOrganizeController();

	const { snapshot: streamState, connectionState } = usePipelineProgress();
	const cancelPipeline = cancelMutation;
	const rerunPipeline = organizeMutation;

	const isConnecting =
		connectionState === "hydrating" ||
		(streamState.status === null && activeRunId != null);

	const isPartial = streamState.status === "partial";
	const isFailed = streamState.status === "failed";

	// Calculate overall progress percentage
	const getProgressPercentage = (): number | null => {
		if (isConnecting) return null;
		if (
			streamState.status === "completed" ||
			streamState.status === "partial" ||
			streamState.status === "failed"
		)
			return 100;

		let percentage = 0;
		const stageIndex = STAGES.findIndex(
			(s) => s.id === streamState.currentStage,
		);

		if (stageIndex >= 0) {
			// Base percentage from completed stages
			percentage = (stageIndex / STAGES.length) * 100;

			// Add partial progress for current stage if available
			if (streamState.currentStage) {
				const currentProgress =
					streamState.progress?.[streamState.currentStage];
				if (currentProgress?.total && currentProgress.total > 0) {
					const processed =
						currentProgress.processed ||
						currentProgress.found ||
						currentProgress.classified ||
						currentProgress.embedded ||
						currentProgress.clusters ||
						0;
					const stageWeight = 100 / STAGES.length;
					const stageProgressRatio = Math.min(
						1,
						processed / currentProgress.total,
					);
					percentage += stageProgressRatio * stageWeight;
				}
			}
		}

		return Math.min(Math.round(percentage), 99);
	};

	const progressPercent = getProgressPercentage();

	const getStageSubtext = (stageId: StageId) => {
		const prog = streamState.progress?.[stageId];

		const stageIndex = STAGES.findIndex((s) => s.id === stageId);
		const currentIndex = STAGES.findIndex(
			(s) => s.id === streamState.currentStage,
		);
		const isStageDone =
			streamState.status === "completed" ||
			streamState.status === "partial" ||
			stageIndex < currentIndex;

		// On a partial run, a stage that produced nothing was effectively skipped
		// because an upstream stage failed — surface that honestly instead of
		// claiming "Completed".
		if (isPartial && stageProducedNothing(stageId, streamState.progress)) {
			return "Skipped — low upstream coverage";
		}

		if (!prog) {
			if (isStageDone) return "Completed";
			if (isConnecting) return "Connecting…";
			if (stageIndex === currentIndex) return "Processing...";
			return "Waiting...";
		}

		switch (stageId) {
			case "sync":
				return prog.total
					? `${prog.total.toLocaleString()} tracks synced`
					: "Syncing...";
			case "lyrics":
				return prog.processed
					? `${prog.processed.toLocaleString()} lyrics collected`
					: isStageDone
						? "Completed"
						: "Collecting...";
			case "classify":
				return prog.classified
					? `Tagged ${prog.classified.toLocaleString()} / ${prog.total?.toLocaleString() ?? "?"} tracks`
					: isStageDone
						? "Completed"
						: "Analyzing emotional tone and themes...";
			case "embed":
				return prog.embedded
					? `Compared ${prog.embedded.toLocaleString()} / ${prog.total?.toLocaleString() ?? "?"} tracks`
					: isStageDone
						? "Completed"
						: "Comparing tracks...";
			case "cluster":
				return prog.clusters
					? `Created ${prog.clusters} ${prog.clusters === 1 ? "group" : "groups"}`
					: isStageDone
						? "Completed"
						: "Grouping similar tracks...";
			case "generate":
				if (prog.playlists || prog.tracksOrganized) {
					const playlistLabel = `Generated ${prog.playlists ?? 0} playlists`;
					if (!prog.tracksOrganized) return playlistLabel;
					return `${playlistLabel} • Organized ${prog.tracksOrganized} tracks`;
				}
				return isStageDone ? "Completed" : "Curating your new library...";
			default:
				return "Processing...";
		}
	};

	const getStageIcon = (stageId: StageId) => {
		const status: PipelineRunStatus | null = streamState.status;

		if (status === "completed") {
			return <Icons.check className="h-5 w-5 text-white" />;
		}

		// Partial run: warn on stages that produced nothing, check the rest.
		if (status === "partial") {
			if (stageProducedNothing(stageId, streamState.progress)) {
				return <Icons.alertTriangle className="h-5 w-5 text-yellow-600" />;
			}
			return <Icons.check className="h-5 w-5 text-white" />;
		}

		const stageIndex = STAGES.findIndex((s) => s.id === stageId);
		const currentIndex = STAGES.findIndex(
			(s) => s.id === streamState.currentStage,
		);

		// Failed run: the stage that was current when it failed is the culprit.
		if (status === "failed") {
			if (stageIndex < currentIndex) {
				return <Icons.check className="h-5 w-5 text-white" />;
			}
			if (stageIndex === currentIndex) {
				return <Icons.alertTriangle className="h-5 w-5 text-destructive" />;
			}
			return <Icons.circle className="h-5 w-5 text-muted-foreground" />;
		}

		if (stageIndex < currentIndex) {
			return <Icons.check className="h-5 w-5 text-white" />;
		}
		if (stageIndex === currentIndex) {
			return <Icons.spinner className="h-5 w-5 animate-spin text-primary" />;
		}
		return <Icons.circle className="h-5 w-5 text-muted-foreground" />;
	};

	const handleRerun = () => {
		rerunPipeline.mutate({});
	};

	return (
		<Drawer open={isAnalysisDrawerOpen} onOpenChange={setIsAnalysisDrawerOpen}>
			<DrawerContent className="flex h-full max-h-[80vh] flex-col bg-background text-foreground">
				<DrawerHeader className="hidden" />
				<DrawerTitle className="sr-only">Music analysis pipeline</DrawerTitle>

				<div className="flex min-h-0 flex-1 flex-col">
					<div className="min-h-0 flex-1 overflow-auto px-6 pt-4">
						<div className="flex flex-col space-y-8">
							<div className="space-y-4">
								<div className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
									OVERALL PROGRESS
								</div>

								{connectionState === "reconnecting" && (
									<div className="text-muted-foreground text-xs">
										Reconnecting…
									</div>
								)}

								<div className="flex items-end justify-between pb-2">
									<div className="font-medium text-5xl">
										{progressPercent === null ? "…" : `${progressPercent}%`}
									</div>
									{streamState.status === "running" && (
										<div className="mb-1 text-muted-foreground text-sm">
											Running...
										</div>
									)}
									{isPartial && (
										<div className="mb-1 text-sm text-yellow-600">
											Low coverage
										</div>
									)}
									{isFailed && (
										<div className="mb-1 text-destructive text-sm">Failed</div>
									)}
								</div>

								<Progress
									value={progressPercent ?? 0}
									className={cn(
										"h-1.5 w-full",
										progressPercent === null && "animate-pulse opacity-60",
									)}
								/>

								{streamState.status === "running" && (
									<p className="text-muted-foreground text-xs">
										You can close this window — we'll email you when it's done.
									</p>
								)}
								{streamState.status === "running" &&
									streamState.etaSeconds != null && (
										<p className="text-muted-foreground text-xs">
											{formatEtaSeconds(streamState.etaSeconds)}
										</p>
									)}

								{(isPartial || isFailed) && streamState.error && (
									<Alert variant={isPartial ? "warning" : "destructive"}>
										<Icons.alertTriangle />
										<AlertDescription>
											{streamState.error}
											{isPartial && " Re-running is recommended."}
										</AlertDescription>
									</Alert>
								)}
							</div>

							<div className="space-y-4 pt-4">
								<div className="border-border border-b pb-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
									PIPELINE STATUS
								</div>

								<ScrollArea className="space-y-6 pt-2">
									{STAGES.map((stage) => {
										const isCurrent = streamState.currentStage === stage.id;
										const isPast =
											STAGES.findIndex((s) => s.id === stage.id) <
											STAGES.findIndex(
												(s) => s.id === streamState.currentStage,
											);
										const isCompleted =
											streamState.status === "completed" ||
											streamState.status === "partial" ||
											isPast;
										const isWarned =
											isPartial &&
											stageProducedNothing(stage.id, streamState.progress);

										return (
											<div
												key={stage.id}
												className={cn(
													"flex items-start gap-4 pb-4 transition-opacity duration-300",
													isCurrent || isCompleted || isWarned
														? "opacity-100"
														: "opacity-40",
												)}
											>
												<div className="mt-0.5">{getStageIcon(stage.id)}</div>
												<div>
													<div className="mb-1 font-medium text-base">
														{stage.label}
													</div>
													<div className="text-muted-foreground text-sm">
														{getStageSubtext(stage.id)}
													</div>
												</div>
											</div>
										);
									})}
								</ScrollArea>
							</div>
						</div>
					</div>

					<DrawerFooter className="flex shrink-0 flex-col gap-2 border-t bg-background px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
						{streamState.status === "running" && (
							<Button
								variant="destructive"
								size="xl"
								disabled={cancelPipeline.isPending}
								onClick={() => {
									if (activeRunId != null) {
										cancelPipeline.mutate({ id: activeRunId });
									}
								}}
							>
								{cancelPipeline.isPending ? "Cancelling…" : "Cancel analysis"}
							</Button>
						)}
						{(isPartial || isFailed) && (
							<Button
								variant="default"
								size="xl"
								disabled={rerunPipeline.isPending}
								onClick={handleRerun}
							>
								{rerunPipeline.isPending
									? "Starting…"
									: isPartial
										? "Re-run analysis"
										: "Try again"}
							</Button>
						)}
					</DrawerFooter>
				</div>
			</DrawerContent>
		</Drawer>
	);
}
