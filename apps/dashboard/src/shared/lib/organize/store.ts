import { create } from "zustand";

const ACTIVE_PIPELINE_RUN_SESSION_KEY =
	"harmonia.dashboard.activePipelineRunId";

export function readPersistedActivePipelineRunId(): number | null {
	if (typeof window === "undefined") return null;
	const raw = sessionStorage.getItem(ACTIVE_PIPELINE_RUN_SESSION_KEY);
	if (raw == null || raw === "") return null;
	const id = Number.parseInt(raw, 10);
	return Number.isFinite(id) ? id : null;
}

export function writePersistedActivePipelineRunId(id: number | null): void {
	if (typeof window === "undefined") return;
	if (id === null) sessionStorage.removeItem(ACTIVE_PIPELINE_RUN_SESSION_KEY);
	else sessionStorage.setItem(ACTIVE_PIPELINE_RUN_SESSION_KEY, String(id));
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
	setIsAnalysisDrawerOpen: (open) => set({ isAnalysisDrawerOpen: open }),
	setExpandedRun: (id) => set({ expandedRunId: id }),
}));
