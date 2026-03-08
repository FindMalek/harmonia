"use client";

import { client } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

export type LivePipelineProgress = {
	tracksTotal: number;
	lyricsCollected: number;
	tracksAnalyzed: number;
	embedded: number;
};

export function useLivePipelineProgress(
	activeRunId: number | null,
): LivePipelineProgress | null {
	const [liveProgress, setLiveProgress] = useState<LivePipelineProgress | null>(
		null,
	);
	const queryClient = useQueryClient();
	const onCompleteRef = useRef(() => {
		queryClient.invalidateQueries({ queryKey: queryKeys.pipeline() });
	});
	onCompleteRef.current = () => {
		queryClient.invalidateQueries({ queryKey: queryKeys.pipeline() });
	};

	useEffect(() => {
		if (activeRunId === null) return;

		const controller = new AbortController();
		let cancelled = false;

		(async () => {
			try {
				const iterator = await client.pipeline.streamStatus(
					{ id: activeRunId },
					{ signal: controller.signal },
				);
				for await (const event of iterator) {
					if (cancelled) break;
					if (event.event === "progress" && event.progress) {
						const p = event.progress as Record<
							string,
							{
								processed?: number;
								total?: number;
								classified?: number;
								embedded?: number;
							}
						>;
						const sync = p.sync;
						const lyrics = p.lyrics;
						const classify = p.classify;
						const embed = p.embed;

						const total =
							typeof sync?.total === "number"
								? sync.total
								: typeof lyrics?.total === "number"
									? lyrics.total
									: typeof classify?.total === "number"
										? classify.total
										: 0;

						setLiveProgress({
							tracksTotal: total,
							lyricsCollected: Number(lyrics?.processed ?? 0),
							tracksAnalyzed: Number(classify?.classified ?? 0),
							embedded: Number(embed?.embedded ?? 0),
						});
					} else if (
						event.event === "completed" ||
						event.event === "failed" ||
						event.event === "error"
					) {
						onCompleteRef.current();
						break;
					}
				}
			} catch (err) {
				if (err instanceof Error && err.name !== "AbortError" && !cancelled) {
					onCompleteRef.current();
				}
			}
		})();

		return () => {
			cancelled = true;
			controller.abort();
		};
	}, [activeRunId, queryClient]);

	return liveProgress;
}
