"use client";

import { useCancelPipeline } from "@/hooks/mutations/use-cancel-pipeline";
import { usePipelineStream } from "@/hooks/use-pipeline-stream";
import { cn } from "@/lib/utils";
import { useOrganizeStore } from "@/shared/lib/organize/store";
import {
	Button,
	Drawer,
	DrawerContent,
	DrawerFooter,
	DrawerHeader,
	Icons,
	Progress,
	ScrollArea,
} from "@harmonia/ui";

const STAGES = [
	{ id: "sync", label: "Syncing library" },
	{ id: "lyrics", label: "Collecting lyrics" },
	{ id: "classify", label: "AI classification" },
	{ id: "embed", label: "Generating embeddings" },
	{ id: "cluster", label: "Clustering tracks" },
	{ id: "generate", label: "Generating playlists" },
] as const;

export function DashboardAnalysisDrawer() {
	const { isAnalysisDrawerOpen, setIsAnalysisDrawerOpen, activeRunId } =
		useOrganizeStore();

	const streamState = usePipelineStream(activeRunId);
	const cancelPipeline = useCancelPipeline();

	// Calculate overall progress percentage
	const getProgressPercentage = () => {
		if (streamState.status === "completed") return 100;
		if (streamState.status === "failed") return 100; // or 0?

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
					percentage += (processed / currentProgress.total) * stageWeight;
				}
			}
		}

		return Math.min(Math.round(percentage), 99);
	};

	const getStageSubtext = (stageId: string) => {
		const prog = streamState.progress?.[stageId];

		if (!prog) {
			if (streamState.status === "completed") return "Completed";

			const stageIndex = STAGES.findIndex((s) => s.id === stageId);
			const currentIndex = STAGES.findIndex(
				(s) => s.id === streamState.currentStage,
			);

			if (stageIndex < currentIndex) return "Completed";
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
					: "Collecting...";
			case "classify":
				return prog.classified
					? `Analyzed ${prog.classified.toLocaleString()} / ${prog.total?.toLocaleString() ?? "?"} tracks`
					: "Analyzing emotional tone and themes...";
			case "embed":
				return prog.embedded
					? `Embedded ${prog.embedded.toLocaleString()} / ${prog.total?.toLocaleString() ?? "?"} tracks`
					: "Generating semantic embeddings...";
			case "cluster":
				return prog.clusters
					? `Created ${prog.clusters} clusters`
					: "Grouping similar tracks...";
			case "generate":
				return prog.playlists
					? `Generated ${prog.playlists} playlists`
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
				<DrawerHeader className="server-only hidden" />

				<div className="flex min-h-0 flex-1 flex-col">
					<div className="min-h-0 flex-1 overflow-auto px-6 pt-4">
						<div className="flex flex-col space-y-8">
							<div className="space-y-4">
								<div className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
									OVERALL PROGRESS
								</div>

								<div className="flex items-end justify-between pb-2">
									<div className="font-medium text-5xl">
										{getProgressPercentage()}%
									</div>
									{streamState.status === "running" && (
										<div className="mb-1 text-muted-foreground text-sm">
											Running...
										</div>
									)}
								</div>

								<Progress
									value={getProgressPercentage()}
									className="h-1.5 w-full"
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
						<Button
							variant="outline"
							size="xl"
							onClick={() => setIsAnalysisDrawerOpen(false)}
						>
							{streamState.status === "completed" ||
							streamState.status === "failed"
								? "Close"
								: "Hide Analysis"}
						</Button>
					</DrawerFooter>
				</div>
			</DrawerContent>
		</Drawer>
	);
}
