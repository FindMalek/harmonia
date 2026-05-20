"use client";

import { cn } from "@/lib/utils";
import { useOrganizeController } from "@/shared/lib/organize/controller.hook";
import { usePipelineProgress } from "@/shared/lib/pipeline/controller.hook";
import {
	Button,
	Drawer,
	DrawerContent,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	Icons,
	Progress,
	ScrollArea,
} from "@harmonia/ui";

const STAGES = [
	{ id: "sync", label: "Syncing library" },
	{ id: "lyrics", label: "Collecting lyrics" },
	{ id: "classify", label: "Tagging tracks" },
	{ id: "embed", label: "Comparing tracks" },
	{ id: "cluster", label: "Grouping tracks" },
	{ id: "generate", label: "Generating playlists" },
] as const;

export function DashboardAnalysisDrawer() {
	const {
		isAnalysisDrawerOpen,
		setIsAnalysisDrawerOpen,
		activeRunId,
		cancelMutation,
	} = useOrganizeController();

	const { snapshot: streamState, connectionState } = usePipelineProgress();
	const cancelPipeline = cancelMutation;

	const isConnecting =
		connectionState === "hydrating" ||
		(streamState.status === null && activeRunId != null);

	// Calculate overall progress percentage
	const getProgressPercentage = (): number | null => {
		if (isConnecting) return null;
		if (streamState.status === "completed") return 100;
		if (streamState.status === "failed") return 100;

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

	const getStageSubtext = (stageId: string) => {
		const prog = streamState.progress?.[stageId];

		const stageIndex = STAGES.findIndex((s) => s.id === stageId);
		const currentIndex = STAGES.findIndex(
			(s) => s.id === streamState.currentStage,
		);
		const isStageDone =
			streamState.status === "completed" || stageIndex < currentIndex;

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
				return prog.playlists
					? `Generated ${prog.playlists} playlists`
					: isStageDone
						? "Completed"
						: "Curating your new library...";
			default:
				return "Processing...";
		}
	};

	const getStageIcon = (stageId: string) => {
		if (streamState.status === "completed") {
			return <Icons.check className="h-5 w-5 text-white" />;
		}

		const stageIndex = STAGES.findIndex((s) => s.id === stageId);
		const currentIndex = STAGES.findIndex(
			(s) => s.id === streamState.currentStage,
		);

		if (stageIndex < currentIndex) {
			return <Icons.check className="h-5 w-5 text-white" />;
		}
		if (stageIndex === currentIndex) {
			return <Icons.spinner className="h-5 w-5 animate-spin text-primary" />;
		}
		return <Icons.circle className="h-5 w-5 text-muted-foreground" />;
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
								</div>

								<Progress
									value={progressPercent ?? 0}
									className={cn(
										"h-1.5 w-full",
										progressPercent === null && "animate-pulse opacity-60",
									)}
								/>
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
											streamState.status === "completed" || isPast;

										return (
											<div
												key={stage.id}
												className={cn(
													"flex items-start gap-4 pb-4 transition-opacity duration-300",
													isCurrent || isCompleted
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
					</DrawerFooter>
				</div>
			</DrawerContent>
		</Drawer>
	);
}
