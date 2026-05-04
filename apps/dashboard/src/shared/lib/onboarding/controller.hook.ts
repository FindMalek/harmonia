"use client";

import { client, orpc } from "@/shared/api/orpc";
import { queryKeys } from "@/shared/api/query-keys";
import type { SyncPhase } from "@harmonia/common/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useOnboardingStore } from "./store";

const ONBOARDING_SYNC_MAX_ATTEMPTS = 6;
const ONBOARDING_SYNC_INITIAL_BACKOFF_MS = 1000;
const ONBOARDING_SYNC_MAX_BACKOFF_MS = 15000;

function delay(ms: number, signal: AbortSignal): Promise<void> {
	return new Promise((resolve, reject) => {
		if (signal.aborted) {
			reject(new DOMException("Aborted", "AbortError"));
			return;
		}
		const id = setTimeout(resolve, ms);
		const onAbort = () => {
			clearTimeout(id);
			reject(new DOMException("Aborted", "AbortError"));
		};
		signal.addEventListener("abort", onAbort, { once: true });
	});
}

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

		const runStream = async () => {
			let syncDone = false;

			const finishSyncSuccess = () => {
				syncDone = true;
				setProgress(100);
				setComplete(true);
				setSyncing(false);
				clearStartRequest();
				void queryClient.invalidateQueries({
					queryKey: queryKeys.spotifyLibraryStats(),
				});
			};

			setIsStreaming(true);
			setSyncing(true);
			setComplete(false);
			setError(null);
			setProgress(0);
			setPhase(null);
			setPhasesCompleted(0);
			setIsReconnecting(false);
			setReconnectAttempt(0);

			let transportFailures = 0;

			try {
				attemptLoop: while (
					!syncDone &&
					transportFailures < ONBOARDING_SYNC_MAX_ATTEMPTS
				) {
					if (cancelled || !isCurrent()) return;

					const attemptNumber = transportFailures + 1;

					if (transportFailures > 0) {
						setIsReconnecting(true);
						setReconnectAttempt(attemptNumber);
						const backoffMs = Math.min(
							ONBOARDING_SYNC_INITIAL_BACKOFF_MS * 2 ** (transportFailures - 1),
							ONBOARDING_SYNC_MAX_BACKOFF_MS,
						);
						try {
							await delay(backoffMs, controller.signal);
						} catch {
							break;
						}
						if (cancelled || !isCurrent()) return;
					}

					let streamEndedWithoutCompletion = false;

					try {
						const iterator = await client.spotify.streamSyncLibrary(
							{},
							{ signal: controller.signal },
						);

						if (!isCurrent() || cancelled) return;

						for await (const event of iterator) {
							if (cancelled || !isCurrent()) break attemptLoop;

							setIsReconnecting(false);

							if (event.event === "progress") {
								setProgress(event.progress.percent);
								setPhase(event.progress.phase);
								setPhasesCompleted(event.progress.phasesCompleted);
								if (event.progress.done) {
									finishSyncSuccess();
									break attemptLoop;
								}
							} else if (event.event === "completed") {
								finishSyncSuccess();
								break attemptLoop;
							} else if (event.event === "failed" || event.event === "error") {
								const msg =
									event.event === "failed" ? event.error : event.message;
								setError(msg ?? "Unknown error");
								setSyncing(false);
								clearStartRequest();
								syncDone = true;
								break attemptLoop;
							}
						}

						if (!syncDone && !cancelled && isCurrent()) {
							streamEndedWithoutCompletion = true;
						}
					} catch (err) {
						if (!isCurrent()) return;
						if (err instanceof Error && err.name === "AbortError") {
							break;
						}
						if (!cancelled) {
							streamEndedWithoutCompletion = true;
						}
					}

					if (syncDone || cancelled || !isCurrent()) break;

					if (streamEndedWithoutCompletion) {
						transportFailures += 1;
						setIsReconnecting(false);
						if (transportFailures >= ONBOARDING_SYNC_MAX_ATTEMPTS) {
							setError(
								"Connection lost after multiple retries. Please try Import again.",
							);
							setSyncing(false);
							clearStartRequest();
							break;
						}
					}
				}
			} finally {
				if (isCurrent()) {
					setIsStreaming(false);
					setIsReconnecting(false);
					setReconnectAttempt(0);
					if (cancelled) {
						setSyncing(false);
					}
				}
			}
		};

		runStream();

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
