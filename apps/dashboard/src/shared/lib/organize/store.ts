import { create } from "zustand";

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
	setActiveRunId: (id) => set({ activeRunId: id }),
	setIsAnalysisDrawerOpen: (open) => set({ isAnalysisDrawerOpen: open }),
	setExpandedRun: (id) => set({ expandedRunId: id }),
}));
