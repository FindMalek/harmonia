"use client";

import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { useDashboardPipelineBootstrap } from "@/hooks/use-dashboard-pipeline-bootstrap";
import {
	PipelineProgressContext,
	usePipelineProgressDrive,
} from "@/shared/lib/pipeline/controller.hook";
import type { ReactNode } from "react";

export function DashboardLayoutShell({ children }: { children: ReactNode }) {
	useDashboardPipelineBootstrap();
	const pipelineProgress = usePipelineProgressDrive();

	return (
		<PipelineProgressContext.Provider value={pipelineProgress}>
			<div className="grid h-svh grid-rows-[auto_1fr]">
				<div className="flex h-full flex-col gap-0 overflow-hidden">
					<div className="flex-1 overflow-auto p-4 pb-20 md:pb-4">
						{children}
					</div>
				</div>
				<MobileBottomNav />
			</div>
		</PipelineProgressContext.Provider>
	);
}
