import { create } from "zustand";

interface OnboardingSyncStore {
	isSyncing: boolean;
	isComplete: boolean;
	shouldStart: boolean;
	setSyncing: (value: boolean) => void;
	setComplete: (value: boolean) => void;
	requestStart: () => void;
	clearStartRequest: () => void;
	reset: () => void;
}

export const useOnboardingSync = create<OnboardingSyncStore>((set) => ({
	isSyncing: false,
	isComplete: false,
	shouldStart: false,
	setSyncing: (value) => set({ isSyncing: value }),
	setComplete: (value) => set({ isComplete: value }),
	requestStart: () => set({ shouldStart: true }),
	clearStartRequest: () => set({ shouldStart: false }),
	reset: () => set({ isSyncing: false, isComplete: false, shouldStart: false }),
}));
