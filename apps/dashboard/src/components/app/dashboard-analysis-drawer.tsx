"use client";

import { usePipelineStream } from "@/hooks/use-pipeline-stream";
import { useDashboardUI } from "@/stores/dashboard-ui";
import {
	Drawer,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
	DrawerDescription,
	DrawerFooter,
	Icons,
	Button,
} from "@harmonia/ui";

// The pipeline stages in order
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
		useDashboardUI();

	const streamState = usePipelineStream(activeRunId);

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
			const currentProgress = streamState.progress?.[streamState.currentStage!];
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
			return <Icons.checkCircle className="h-5 w-5 text-white" />;
		}

		const stageIndex = STAGES.findIndex((s) => s.id === stageId);
		const currentIndex = STAGES.findIndex(
			(s) => s.id === streamState.currentStage,
		);

		if (stageIndex < currentIndex) {
			return <Icons.checkCircle className="h-5 w-5 text-white" />;
		}
		if (stageIndex === currentIndex) {
			return <Icons.spinner className="h-5 w-5 animate-spin text-primary" />;
		}
		return <Icons.circle className="h-5 w-5 text-muted-foreground" />;
	};

	return (
		<Drawer open={isAnalysisDrawerOpen} onOpenChange={setIsAnalysisDrawerOpen}>
			<DrawerContent className="h-full w-[400px] rounded-none border-l bg-background text-foreground">
				<div className="flex h-full flex-col overflow-y-auto p-6">
					<DrawerHeader className="px-0 pt-0 pb-6 text-left">
						<DrawerTitle className="mb-2 font-medium text-2xl">
							Analysis Pipeline
						</DrawerTitle>
						<DrawerDescription className="text-base text-muted-foreground">
							{streamState.status === "completed"
								? "Analysis complete!"
								: streamState.status === "failed"
									? "Analysis failed."
									: "Processing your Spotify library..."}
						</DrawerDescription>
					</DrawerHeader>

					<div className="flex-1 space-y-8">
						{/* Overall Progress */}
						<div className="space-y-4">
							<div className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
								OVERALL PROGRESS
							</div>

							<div className="flex items-end justify-between border-border border-b pb-6">
								<div className="font-medium text-5xl">
									{getProgressPercentage()}%
								</div>
								{streamState.status === "running" && (
									<div className="mb-1 text-muted-foreground text-sm">
										Running...
									</div>
								)}
							</div>

							<div className="relative h-1.5 w-full overflow-hidden rounded-full bg-secondary">
								<div
									className="absolute top-0 left-0 h-full rounded-full bg-primary transition-all duration-500 ease-out"
									style={{ width: `${getProgressPercentage()}%` }}
								/>
							</div>
						</div>

						{/* Pipeline Status */}
						<div className="space-y-4 pt-4">
							<div className="border-border border-b pb-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
								PIPELINE STATUS
							</div>

							<div className="space-y-6 pt-2">
								{STAGES.map((stage) => {
									const isCurrent = streamState.currentStage === stage.id;
									const isPast =
										STAGES.findIndex((s) => s.id === stage.id) <
										STAGES.findIndex((s) => s.id === streamState.currentStage);
									const isCompleted =
										streamState.status === "completed" || isPast;

									return (
										<div
											key={stage.id}
											className={`flex items-start gap-4 transition-opacity duration-300 ${isCurrent || isCompleted ? "opacity-100" : "opacity-40"}`}
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
							</div>
						</div>
					</div>

					<DrawerFooter className="mt-auto px-0 pt-6 pb-0">
						<Button
							variant="outline"
							className="h-12 w-full rounded-xl border-border bg-secondary/50 font-normal text-base hover:bg-secondary"
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
