import { create } from "zustand";

interface OnboardingSyncStore {
	isSyncing: boolean;
	isComplete: boolean;
	setSyncing: (value: boolean) => void;
	setComplete: (value: boolean) => void;
	reset: () => void;
}

export const useOnboardingSync = create<OnboardingSyncStore>((set) => ({
	isSyncing: false,
	isComplete: false,
	setSyncing: (value) => set({ isSyncing: value }),
	setComplete: (value) => set({ isComplete: value }),
	reset: () => set({ isSyncing: false, isComplete: false }),
}));
