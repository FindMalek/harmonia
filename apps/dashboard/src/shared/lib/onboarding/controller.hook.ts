"use client";

import type { SyncPhase } from "@sonaraem/common/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { client, orpc } from "@/shared/api/orpc";
import { queryKeys } from "@/shared/api/query-keys";
import { ONBOARDING_SYNC_MAX_ATTEMPTS } from "@/shared/lib/constants";
import { runOnboardingSyncLibraryLoop } from "./onboarding.util";
import { useOnboardingStore } from "./store";

export type OnboardingSyncStream = {
	progress: number;
	phase: SyncPhase | null;
	phasesCompleted: number;
	error: string | null;
	isStreaming: boolean;
	isReconnecting: boolean;
	reconnectAttempt: number;
	maxStreamAttempts: number;
};

export function useOnboardingController() {
	const store = useOnboardingStore();
	const queryClient = useQueryClient();

	const syncMutation = useMutation(
		orpc.spotify.syncLibrary.mutationOptions({
			onSuccess: () => {
				store.setComplete(true);
				store.setSyncing(false);
				void queryClient.invalidateQueries({
					queryKey: queryKeys.spotifyLibraryStats(),
				});
			},
			onError: (error: Error) => {
				console.error("Sync failed", error);
				store.setSyncing(false);
			},
		}),
	);

	return { ...store, syncMutation };
}

export function useOnboardingSyncStream(): OnboardingSyncStream {
	const queryClient = useQueryClient();
	const { shouldStart, setSyncing, setComplete, clearStartRequest } =
		useOnboardingStore();

	const [progress, setProgress] = useState(0);
	const [phase, setPhase] = useState<SyncPhase | null>(null);
	const [phasesCompleted, setPhasesCompleted] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const [isStreaming, setIsStreaming] = useState(false);
	const [isReconnecting, setIsReconnecting] = useState(false);
	const [reconnectAttempt, setReconnectAttempt] = useState(0);
	const streamEffectRunIdRef = useRef(0);

	useEffect(() => {
		if (!shouldStart) return;

		const runId = ++streamEffectRunIdRef.current;
		const controller = new AbortController();
		let cancelled = false;

		const isCurrent = () => streamEffectRunIdRef.current === runId;

		void runOnboardingSyncLibraryLoop({
			signal: controller.signal,
			isCurrent,
			getCancelled: () => cancelled,
			queryClient,
			streamSyncLibrary: client.spotify.streamSyncLibrary,
			setProgress,
			setPhase,
			setPhasesCompleted,
			setError,
			setIsStreaming,
			setIsReconnecting,
			setReconnectAttempt,
			setSyncing,
			setComplete,
			clearStartRequest,
		});

		return () => {
			cancelled = true;
			controller.abort();
		};
	}, [clearStartRequest, queryClient, setComplete, setSyncing, shouldStart]);

	return {
		progress,
		phase,
		phasesCompleted,
		error,
		isStreaming,
		isReconnecting,
		reconnectAttempt,
		maxStreamAttempts: ONBOARDING_SYNC_MAX_ATTEMPTS,
	};
}
