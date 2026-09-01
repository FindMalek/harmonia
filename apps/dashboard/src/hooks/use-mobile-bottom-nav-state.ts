"use client";

import { DASHBOARD_ROUTES } from "@sonaraem/common/utils/routes";
import { usePathname } from "next/navigation";
import { useOrganizeStore } from "@/shared/lib/organize/store";
import { usePipelineProgress } from "@/shared/lib/pipeline/controller.hook";

export function useMobileBottomNavState() {
	const pathname = usePathname();
	const { activeRunId, isAnalysisDrawerOpen } = useOrganizeStore();
	const { snapshot: streamState, connectionState } = usePipelineProgress();

	const hidden =
		(pathname.startsWith(`${DASHBOARD_ROUTES.playlists.path}/`) &&
			DASHBOARD_ROUTES.playlists.children.detail.hideBottomNav) ||
		(pathname.startsWith(`${DASHBOARD_ROUTES.tracks.path}/`) &&
			DASHBOARD_ROUTES.tracks.children.detail.hideBottomNav);

	const showAnalysisBar =
		!hidden &&
		activeRunId != null &&
		!isAnalysisDrawerOpen &&
		(streamState.status === "running" || connectionState === "reconnecting");

	return { hidden, showAnalysisBar };
}

/** Scroll area padding so content clears the fixed mobile bottom nav (+ analysis bar). */
export function mobileMainContentPaddingClass({
	hidden,
	showAnalysisBar,
}: {
	hidden: boolean;
	showAnalysisBar: boolean;
}) {
	if (hidden) {
		return "pb-4 md:pb-4";
	}
	if (showAnalysisBar) {
		return "pb-[calc(8.75rem+env(safe-area-inset-bottom,0px))] md:pb-4";
	}
	return "pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] md:pb-4";
}
