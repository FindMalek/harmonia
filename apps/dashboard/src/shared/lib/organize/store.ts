import { create } from "zustand";
import { DASHBOARD_SESSION_STORAGE_KEYS } from "@/shared/lib/constants";

export function readPersistedActivePipelineRunId(): number | null {
	if (typeof window === "undefined") return null;
	const raw = sessionStorage.getItem(
		DASHBOARD_SESSION_STORAGE_KEYS.ACTIVE_PIPELINE_RUN_ID,
	);
	if (raw == null || raw === "") return null;
	const id = Number.parseInt(raw, 10);
	return Number.isFinite(id) ? id : null;
}

export function writePersistedActivePipelineRunId(id: number | null): void {
	if (typeof window === "undefined") return;
	if (id === null) {
		sessionStorage.removeItem(
			DASHBOARD_SESSION_STORAGE_KEYS.ACTIVE_PIPELINE_RUN_ID,
		);
	} else {
		sessionStorage.setItem(
			DASHBOARD_SESSION_STORAGE_KEYS.ACTIVE_PIPELINE_RUN_ID,
			String(id),
		);
	}
}

export function readPersistedAnalysisDrawerOpen(): boolean {
	if (typeof window === "undefined") return false;
	return (
		sessionStorage.getItem(
			DASHBOARD_SESSION_STORAGE_KEYS.ANALYSIS_DRAWER_OPEN,
		) === "1"
	);
}

export function writePersistedAnalysisDrawerOpen(open: boolean): void {
	if (typeof window === "undefined") return;
	if (open) {
		sessionStorage.setItem(
			DASHBOARD_SESSION_STORAGE_KEYS.ANALYSIS_DRAWER_OPEN,
			"1",
		);
	} else {
		sessionStorage.removeItem(
			DASHBOARD_SESSION_STORAGE_KEYS.ANALYSIS_DRAWER_OPEN,
		);
	}
}

interface OrganizeStore {
	activeRunId: number | null;
	isAnalysisDrawerOpen: boolean;
	expandedRunId: number | null;
	setActiveRunId: (id: number | null) => void;
	setIsAnalysisDrawerOpen: (open: boolean) => void;
	setExpandedRun: (id: number | null) => void;
}

export const useOrganizeStore = create<OrganizeStore>((set) => ({
	activeRunId: null,
	isAnalysisDrawerOpen: false,
	expandedRunId: null,
	setActiveRunId: (id) => {
		set({ activeRunId: id });
		writePersistedActivePipelineRunId(id);
	},
	setIsAnalysisDrawerOpen: (open) => {
		writePersistedAnalysisDrawerOpen(open);
		set({ isAnalysisDrawerOpen: open });
	},
	setExpandedRun: (id) => set({ expandedRunId: id }),
}));
