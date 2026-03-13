"use client";

import { useOnboardingSync } from "@/stores/onboarding-sync";
import { client } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import type { SyncPhase } from "@harmonia/common/types";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DASHBOARD_ROUTES } from "@harmonia/common/utils/routes";

export type OnboardingSyncStream = {
	progress: number;
	phase: SyncPhase | null;
	phasesCompleted: number;
	error: string | null;
	isStreaming: boolean;
	start: () => void;
};

export function useOnboardingSyncStream(): OnboardingSyncStream {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { setSyncing, setComplete } = useOnboardingSync();

	const [progress, setProgress] = useState(0);
	const [phase, setPhase] = useState<SyncPhase | null>(null);
	const [phasesCompleted, setPhasesCompleted] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const [isStreaming, setIsStreaming] = useState(false);
	const [shouldStart, setShouldStart] = useState(false);

	const onCompleteRef = useRef(() => {
		setComplete(true);
		setSyncing(false);
		queryClient.invalidateQueries({
			queryKey: queryKeys.spotifyLibraryStats(),
		});
		router.refresh();
		setTimeout(() => router.push(DASHBOARD_ROUTES.overview.path), 1000);
	});

	// Keep ref updated
	useEffect(() => {
		onCompleteRef.current = () => {
			setComplete(true);
			setSyncing(false);
			queryClient.invalidateQueries({
				queryKey: queryKeys.spotifyLibraryStats(),
			});
			router.refresh();
			setTimeout(() => router.push(DASHBOARD_ROUTES.overview.path), 1000);
		};
	}, [setComplete, setSyncing, queryClient, router]);

	useEffect(() => {
		if (!shouldStart) return;

		const controller = new AbortController();
		let cancelled = false;

		const runStream = async () => {
			setIsStreaming(true);
			setSyncing(true);
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
						onCompleteRef.current();
						break;
					} else if (event.event === "failed" || event.event === "error") {
						const msg = event.event === "failed" ? event.error : event.message;
						setError(msg ?? "Unknown error");
						setSyncing(false);
						break;
					}
				}
			} catch (err) {
				if (err instanceof Error && err.name !== "AbortError" && !cancelled) {
					setError(err.message);
					setSyncing(false);
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
	}, [shouldStart, setSyncing]);

	return {
		progress,
		phase,
		phasesCompleted,
		error,
		isStreaming,
		start: () => setShouldStart(true),
	};
}
