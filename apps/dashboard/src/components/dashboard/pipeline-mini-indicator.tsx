"use client";

import { useDashboardUI } from "@/stores/dashboard-ui";
import { usePipelineStream } from "@/hooks/use-pipeline-stream";
import { Loader2 } from "lucide-react";
import { Button } from "@harmonia/ui";

export function PipelineMiniIndicator() {
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
		<div className="fixed bottom-6 right-6 z-40">
			<Button
				variant="outline"
				className="bg-[#0a0a0a] border-white/10 text-white shadow-lg hover:bg-white/5 flex items-center gap-3 rounded-full px-4 h-12"
				onClick={() => setIsAnalysisDrawerOpen(true)}
			>
				<Loader2 className="h-4 w-4 animate-spin text-purple-500" />
				<span className="text-sm font-medium">Analyzing Library...</span>
			</Button>
		</div>
	);
}
