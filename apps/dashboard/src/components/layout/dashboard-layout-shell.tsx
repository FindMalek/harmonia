"use client";

import { type ReactNode, useLayoutEffect, useRef } from "react";
import { DashboardAnalysisDrawer } from "@/components/app/dashboard-analysis-drawer";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { useDashboardPipelineBootstrap } from "@/hooks/use-dashboard-pipeline-bootstrap";
import { DashboardScrollContainerContext } from "@/hooks/use-dashboard-scroll-container";
import {
	mobileMainContentPaddingClass,
	useMobileBottomNavState,
} from "@/hooks/use-mobile-bottom-nav-state";
import { cn } from "@/lib/utils";
import {
	readPersistedAnalysisDrawerOpen,
	useOrganizeStore,
} from "@/shared/lib/organize/store";
import {
	PipelineProgressContext,
	usePipelineProgressDrive,
} from "@/shared/lib/pipeline/controller.hook";

export function DashboardLayoutShell({ children }: { children: ReactNode }) {
	useDashboardPipelineBootstrap();
	const pipelineProgress = usePipelineProgressDrive();

	return (
		<PipelineProgressContext.Provider value={pipelineProgress}>
			<DashboardLayoutShellInner>{children}</DashboardLayoutShellInner>
		</PipelineProgressContext.Provider>
	);
}

function DashboardLayoutShellInner({ children }: { children: ReactNode }) {
	const mobileNav = useMobileBottomNavState();
	const hydratedDrawerRef = useRef(false);
	const scrollContainerRef = useRef<HTMLDivElement>(null);

	useLayoutEffect(() => {
		if (hydratedDrawerRef.current) return;
		hydratedDrawerRef.current = true;
		if (readPersistedAnalysisDrawerOpen()) {
			useOrganizeStore.getState().setIsAnalysisDrawerOpen(true);
		}
	}, []);

	return (
		<div className="grid h-svh grid-rows-[auto_1fr]">
			<div className="flex h-full flex-col gap-0 overflow-hidden">
				<div
					ref={scrollContainerRef}
					className={cn(
						"flex-1 overflow-auto p-4",
						mobileMainContentPaddingClass(mobileNav),
					)}
				>
					<DashboardScrollContainerContext.Provider value={scrollContainerRef}>
						{children}
					</DashboardScrollContainerContext.Provider>
				</div>
			</div>
			<MobileBottomNav />
			<DashboardAnalysisDrawer />
		</div>
	);
}
