"use client";

import type { SyncPhase } from "@harmonia/common/types";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { client } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { useOnboardingSync } from "@/stores/onboarding-sync";

export type OnboardingSyncStream = {
	progress: number;
	phase: SyncPhase | null;
	phasesCompleted: number;
	error: string | null;
	isStreaming: boolean;
};

export function useOnboardingSyncStream(): OnboardingSyncStream {
	const queryClient = useQueryClient();
	const shouldStart = useOnboardingSync((state) => state.shouldStart);
	const setSyncing = useOnboardingSync((state) => state.setSyncing);
	const setComplete = useOnboardingSync((state) => state.setComplete);
	const clearStartRequest = useOnboardingSync(
		(state) => state.clearStartRequest,
	);

	const [progress, setProgress] = useState(0);
	const [phase, setPhase] = useState<SyncPhase | null>(null);
	const [phasesCompleted, setPhasesCompleted] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const [isStreaming, setIsStreaming] = useState(false);

	useEffect(() => {
		if (!shouldStart) return;

		const controller = new AbortController();
		let cancelled = false;

		const runStream = async () => {
			setIsStreaming(true);
			setSyncing(true);
			setComplete(false);
			setError(null);

			try {
				const iterator = await client.spotify.streamSyncLibrary(
					{},
					{ signal: controller.signal },
				);

				for await (const event of iterator) {
					if (cancelled) break;

					if (event.event === "progress") {
						setProgress(event.progress.percent);
						setPhase(event.progress.phase);
						setPhasesCompleted(event.progress.phasesCompleted);
					} else if (event.event === "completed") {
						setProgress(100);
						setComplete(true);
						setSyncing(false);
						clearStartRequest();
						void queryClient.invalidateQueries({
							queryKey: queryKeys.spotifyLibraryStats(),
						});
						break;
					} else if (event.event === "failed" || event.event === "error") {
						const msg = event.event === "failed" ? event.error : event.message;
						setError(msg ?? "Unknown error");
						setSyncing(false);
						clearStartRequest();
						break;
					}
				}
			} catch (err) {
				if (err instanceof Error && err.name !== "AbortError" && !cancelled) {
					setError(err.message);
					setSyncing(false);
					clearStartRequest();
				}
			} finally {
				if (!cancelled) {
					setIsStreaming(false);
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
	};
}
