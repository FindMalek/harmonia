"use client";

import { DashboardAnalysisDrawer } from "@/components/app/dashboard-analysis-drawer";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { useDashboardPipelineBootstrap } from "@/hooks/use-dashboard-pipeline-bootstrap";
import {
	readPersistedAnalysisDrawerOpen,
	useOrganizeStore,
} from "@/shared/lib/organize/store";
import {
	PipelineProgressContext,
	usePipelineProgressDrive,
} from "@/shared/lib/pipeline/controller.hook";
import { type ReactNode, useLayoutEffect, useRef } from "react";

export function DashboardLayoutShell({ children }: { children: ReactNode }) {
	useDashboardPipelineBootstrap();
	const pipelineProgress = usePipelineProgressDrive();
	const hydratedDrawerRef = useRef(false);

	useLayoutEffect(() => {
		if (hydratedDrawerRef.current) return;
		hydratedDrawerRef.current = true;
		if (readPersistedAnalysisDrawerOpen()) {
			useOrganizeStore.getState().setIsAnalysisDrawerOpen(true);
		}
	}, []);

	return (
		<PipelineProgressContext.Provider value={pipelineProgress}>
			<div className="grid h-svh grid-rows-[auto_1fr]">
				<div className="flex h-full flex-col gap-0 overflow-hidden">
					<div className="flex-1 overflow-auto p-4 pb-20 md:pb-4">
						{children}
					</div>
				</div>
				<MobileBottomNav />
				<DashboardAnalysisDrawer />
			</div>
		</PipelineProgressContext.Provider>
	);
}
