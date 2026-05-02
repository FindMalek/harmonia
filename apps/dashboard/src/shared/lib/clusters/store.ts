import { create } from "zustand";

interface ClustersStore {
	selectedClusterId: number | null;
	setSelectedCluster: (id: number | null) => void;
}

export const useClustersStore = create<ClustersStore>((set) => ({
	selectedClusterId: null,
	setSelectedCluster: (id) => set({ selectedClusterId: id }),
}));
