"use client";

import { usePipelineStream } from "@/hooks/use-pipeline-stream";
import { useDashboardUI } from "@/stores/dashboard-ui";
import { Button } from "@harmonia/ui";
import { Loader2 } from "lucide-react";

export function DashboardPipelineMiniIndicator() {
	const { activeRunId, isAnalysisDrawerOpen, setIsAnalysisDrawerOpen } =
		useDashboardUI();

	const streamState = usePipelineStream(activeRunId);

	// Only show when there is an active run, the drawer is closed, and it hasn't completed/failed yet
	if (
		!activeRunId ||
		isAnalysisDrawerOpen ||
		streamState.status === "completed" ||
		streamState.status === "failed"
	) {
		return null;
	}

	return (
		<div className="fixed right-6 bottom-6 z-40">
			<Button
				variant="outline"
				className="flex h-12 items-center gap-3 rounded-full border-border bg-background px-4 text-foreground shadow-lg hover:bg-secondary"
				onClick={() => setIsAnalysisDrawerOpen(true)}
			>
				<Loader2 className="h-4 w-4 animate-spin text-primary" />
				<span className="font-medium text-sm">Analyzing Library...</span>
			</Button>
		</div>
	);
}
