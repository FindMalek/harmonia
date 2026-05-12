import { queryKeys } from "@/shared/api/query-keys";
import {
	ONBOARDING_SYNC_INITIAL_BACKOFF_MS,
	ONBOARDING_SYNC_MAX_ATTEMPTS,
	ONBOARDING_SYNC_MAX_BACKOFF_MS,
} from "@/shared/lib/constants";
import type { SyncProgressEvent } from "@harmonia/common/schemas";
import type { SyncPhase } from "@harmonia/common/types";
import type { QueryClient } from "@tanstack/react-query";
import type { Dispatch, SetStateAction } from "react";

function delayAbortable(ms: number, signal: AbortSignal): Promise<void> {
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

export type RunOnboardingSyncLibraryLoopParams = {
	signal: AbortSignal;
	isCurrent: () => boolean;
	getCancelled: () => boolean;
	queryClient: QueryClient;
	streamSyncLibrary: (
		input: Record<string, never>,
		opts: { signal: AbortSignal },
	) => Promise<AsyncIterable<SyncProgressEvent>>;
	setProgress: Dispatch<SetStateAction<number>>;
	setPhase: Dispatch<SetStateAction<SyncPhase | null>>;
	setPhasesCompleted: Dispatch<SetStateAction<number>>;
	setError: Dispatch<SetStateAction<string | null>>;
	setIsStreaming: Dispatch<SetStateAction<boolean>>;
	setIsReconnecting: Dispatch<SetStateAction<boolean>>;
	setReconnectAttempt: Dispatch<SetStateAction<number>>;
	setSyncing: (value: boolean) => void;
	setComplete: (value: boolean) => void;
	clearStartRequest: () => void;
};

export async function runOnboardingSyncLibraryLoop(
	params: RunOnboardingSyncLibraryLoopParams,
): Promise<void> {
	const {
		signal,
		isCurrent,
		getCancelled,
		queryClient,
		streamSyncLibrary,
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
	} = params;

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
			if (getCancelled() || !isCurrent()) return;

			const attemptNumber = transportFailures + 1;

			if (transportFailures > 0) {
				setIsReconnecting(true);
				setReconnectAttempt(attemptNumber);
				const backoffMs = Math.min(
					ONBOARDING_SYNC_INITIAL_BACKOFF_MS * 2 ** (transportFailures - 1),
					ONBOARDING_SYNC_MAX_BACKOFF_MS,
				);
				try {
					await delayAbortable(backoffMs, signal);
				} catch {
					break;
				}
				if (getCancelled() || !isCurrent()) return;
			}

			let streamEndedWithoutCompletion = false;

			try {
				const iterator = await streamSyncLibrary({}, { signal });

				if (!isCurrent() || getCancelled()) return;

				for await (const event of iterator) {
					if (getCancelled() || !isCurrent()) break attemptLoop;

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
					} else if (event.event === "failed") {
						setError(event.error ?? "Unknown error");
						setSyncing(false);
						clearStartRequest();
						syncDone = true;
						break attemptLoop;
					} else if (event.event === "error") {
						setError(event.message ?? "Unknown error");
						setSyncing(false);
						clearStartRequest();
						syncDone = true;
						break attemptLoop;
					}
				}

				if (!syncDone && !getCancelled() && isCurrent()) {
					streamEndedWithoutCompletion = true;
				}
			} catch (err) {
				if (!isCurrent()) return;
				if (err instanceof Error && err.name === "AbortError") {
					break;
				}
				if (!getCancelled()) {
					streamEndedWithoutCompletion = true;
				}
			}

			if (syncDone || getCancelled() || !isCurrent()) break;

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
			if (getCancelled()) {
				setSyncing(false);
			}
		}
	}
}
