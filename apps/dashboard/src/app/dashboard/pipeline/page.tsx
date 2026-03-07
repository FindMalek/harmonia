"use client";

import {
	Badge,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	CopyableError,
	EmptyState,
	ErrorState,
	PageLoader,
	Progress,
} from "@harmonia/ui";
import { client, orpc, queryClient } from "@/lib/orpc";

import { Icons } from "@harmonia/ui/components/icons";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

const STAGE_ORDER = [
	"sync",
	"lyrics",
	"classify",
	"embed",
	"cluster",
	"generate",
] as const;

const STAGE_LABELS: Record<string, string> = {
	sync: "Spotify Sync",
	lyrics: "Lyrics Fetch",
	classify: "AI Classification",
	embed: "Embeddings",
	cluster: "Clustering",
	generate: "Playlist Generation",
};

export default function PipelinePage() {
	const [expandedRunId, setExpandedRunId] = useState<number | null>(null);
	const {
		data: runs,
		isLoading,
		isError,
		error,
		refetch,
	} = useQuery({
		...orpc.pipeline.getAll.queryOptions(),
	});

	if (isError) {
		return (
			<div className="space-y-6">
				<div>
					<h2 className="font-semibold text-base">Pipeline</h2>
					<p className="text-muted-foreground text-xs">
						Monitor pipeline execution and history
					</p>
				</div>
				<ErrorState
					message={
						error instanceof Error
							? error.message
							: "Failed to load pipeline runs"
					}
					onRetry={() => refetch()}
				/>
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className="space-y-6">
				<div>
					<h2 className="font-semibold text-base">Pipeline</h2>
					<p className="text-muted-foreground text-xs">
						Monitor pipeline execution and history
					</p>
				</div>
				<PageLoader message="Loading pipeline runs..." />
			</div>
		);
	}

	const activeRun = runs?.find((r) => r.status === "running");

	return (
		<div className="space-y-6">
			<div>
				<h2 className="font-semibold text-base">Pipeline</h2>
				<p className="text-muted-foreground text-xs">
					Monitor pipeline execution and history
				</p>
			</div>

			{activeRun && (
				<ActiveRunCard
					run={activeRun}
					onComplete={() =>
						queryClient.invalidateQueries({
							queryKey: orpc.pipeline.getAll.key(),
						})
					}
				/>
			)}

			<div>
				<h3 className="mb-3 font-medium text-sm">Run History</h3>
				<div className="space-y-2">
					{runs?.map((run) => (
						<RunRow
							key={run.id}
							run={run}
							expanded={expandedRunId === run.id}
							onToggle={() =>
								setExpandedRunId((id) => (id === run.id ? null : run.id))
							}
						/>
					))}
					{(!runs || runs.length === 0) && (
						<EmptyState
							icon={Icons.play}
							title="No pipeline runs yet"
							description="Click Run Pipeline on the overview page to start."
							action={{
								label: "Run Pipeline",
								onClick: () => (window.location.href = "/dashboard"),
							}}
							variant="card"
						/>
					)}
				</div>
			</div>
		</div>
	);
}

type Run = NonNullable<
	Awaited<ReturnType<typeof orpc.pipeline.getAll.queryOptions>>["queryFn"]
> extends (...args: unknown[]) => Promise<infer T>
	? T extends (infer U)[]
		? U
		: never
	: never;

function ActiveRunCard({
	run: initialRun,
	onComplete,
}: {
	run: {
		id: number;
		status: string;
		currentStage: string | null;
		progress: unknown;
		startedAt: Date | string | null;
	};
	onComplete: () => void;
}) {
	const [run, setRun] = useState(initialRun);
	const onCompleteRef = useRef(onComplete);
	onCompleteRef.current = onComplete;

	useEffect(() => {
		const controller = new AbortController();
		let cancelled = false;

		(async () => {
			try {
				const iterator = await client.pipeline.streamStatus(
					{ id: initialRun.id },
					{ signal: controller.signal },
				);
				for await (const event of iterator) {
					if (cancelled) break;
					if (event.event === "progress") {
						setRun({
							id: event.runId,
							status: event.status,
							currentStage: event.currentStage,
							progress: event.progress,
							startedAt: event.startedAt,
						});
					} else if (
						event.event === "completed" ||
						event.event === "failed" ||
						event.event === "error"
					) {
						if (event.event === "completed" || event.event === "failed") {
							setRun((prev) => ({
								...prev,
								status: event.event,
								progress: event.progress,
								completedAt: event.completedAt,
								...(event.event === "failed" ? { error: event.error } : {}),
							}));
						}
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
	}, [initialRun.id]);

	const progress = (run.progress ?? {}) as Record<
		string,
		Record<string, unknown>
	>;
	const currentStageIdx = STAGE_ORDER.indexOf(
		run.currentStage as (typeof STAGE_ORDER)[number],
	);

	return (
		<Card className="border-l-4 border-l-yellow-500">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					Run #{run.id}
					<Badge variant="outline" className="text-yellow-600">
						Running
					</Badge>
				</CardTitle>
				<CardDescription>
					Stage: {STAGE_LABELS[run.currentStage ?? ""] ?? run.currentStage}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="space-y-3">
					{STAGE_ORDER.map((stage, idx) => {
						const stageData = progress[stage] as
							| Record<string, unknown>
							| undefined;
						const isComplete = idx < currentStageIdx;
						const isCurrent = idx === currentStageIdx;
						const progressValue = computeStageProgressValue(
							stage,
							stageData,
							isComplete,
							isCurrent,
						);

						return (
							<div key={stage} className="space-y-1">
								<div className="flex items-center justify-between">
									<span
										className={`font-medium text-xs ${
											isCurrent
												? "text-foreground"
												: isComplete
													? "text-green-600"
													: "text-muted-foreground"
										}`}
									>
										{STAGE_LABELS[stage]}
									</span>
									<span className="text-muted-foreground text-xs">
										{isComplete
											? "Done"
											: isCurrent
												? formatStageProgress(stage, stageData)
												: "Pending"}
									</span>
								</div>
								<Progress
									value={progressValue}
									className="h-1 transition-all"
								/>
							</div>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
}

function RunRow({
	run,
	expanded,
	onToggle,
}: {
	run: {
		id: number;
		status: string;
		currentStage: string | null;
		progress: unknown;
		startedAt: Date | string | null;
		completedAt: Date | string | null;
		error: string | null;
	};
	expanded: boolean;
	onToggle: () => void;
}) {
	const statusColor =
		run.status === "completed"
			? "text-green-600"
			: run.status === "failed"
				? "text-red-500"
				: run.status === "running"
					? "text-yellow-500"
					: "text-muted-foreground";

	const duration =
		run.startedAt && run.completedAt
			? Math.round(
					(new Date(run.completedAt).getTime() -
						new Date(run.startedAt).getTime()) /
						1000,
				)
			: null;

	const progress = (run.progress ?? {}) as Record<
		string,
		Record<string, unknown> | undefined
	>;
	const hasExpandableContent = run.error || Object.keys(progress).length > 0;

	return (
		<div className="border-b last:border-b-0">
			<button
				type="button"
				className="flex w-full items-center justify-between py-2 text-left text-xs transition-colors hover:bg-muted/50"
				onClick={hasExpandableContent ? onToggle : undefined}
			>
				<div className="flex items-center gap-2">
					{hasExpandableContent ? (
						expanded ? (
							<Icons.chevronDown className="size-3.5 shrink-0" />
						) : (
							<Icons.chevronRight className="size-3.5 shrink-0" />
						)
					) : null}
					<div className="flex items-center gap-3">
						<span className="font-mono text-muted-foreground">#{run.id}</span>
						<span className={`font-medium ${statusColor}`}>{run.status}</span>
						{run.currentStage && run.status === "running" && (
							<span className="text-muted-foreground">
								{STAGE_LABELS[run.currentStage]}
							</span>
						)}
					</div>
				</div>
				<div className="flex items-center gap-3 text-muted-foreground">
					{duration !== null && <span>{duration}s</span>}
					{run.startedAt && (
						<span>{new Date(run.startedAt).toLocaleString()}</span>
					)}
				</div>
			</button>
			{expanded && hasExpandableContent && (
				<div className="space-y-2 border-t pb-3 pl-6 pr-3 pt-2">
					{run.error && (
						<div>
							<p className="mb-1 font-medium text-xs text-destructive">Error</p>
							<CopyableError text={run.error} variant="error" />
						</div>
					)}
					{Object.keys(progress).length > 0 && (
						<div>
							<p className="mb-1 font-medium text-muted-foreground text-xs">
								Stage progress
							</p>
							<ul className="space-y-0.5 text-muted-foreground text-xs">
								{STAGE_ORDER.filter((s) => progress[s]).map((stage) => (
									<li key={stage}>
										{STAGE_LABELS[stage]}:{" "}
										{formatStageProgress(stage, progress[stage])}
									</li>
								))}
							</ul>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

function computeStageProgressValue(
	stage: string,
	data: Record<string, unknown> | undefined,
	isComplete: boolean,
	isCurrent: boolean,
): number {
	if (isComplete) return 100;
	if (!isCurrent) return 0;
	if (!data) return 50;

	switch (stage) {
		case "sync":
			return (data.done as boolean) ? 100 : 50;
		case "lyrics": {
			const processed = Number(data.processed ?? 0);
			const total = Number(data.total ?? 1);
			return total > 0 ? Math.round((processed / total) * 100) : 50;
		}
		case "classify": {
			const classified = Number(data.classified ?? 0);
			const total = Number(data.total ?? 1);
			return total > 0 ? Math.round((classified / total) * 100) : 50;
		}
		case "embed": {
			const embedded = Number(data.embedded ?? 0);
			const total = Number(data.total ?? 1);
			return total > 0 ? Math.round((embedded / total) * 100) : 50;
		}
		case "cluster":
		case "generate":
			return 50;
		default:
			return 50;
	}
}

function formatStageProgress(
	stage: string,
	data: Record<string, unknown> | undefined,
): string {
	if (!data) return "Processing...";

	switch (stage) {
		case "sync":
			return `${data.total ?? 0} tracks`;
		case "lyrics":
			return `${data.processed ?? 0} processed`;
		case "classify":
			return `${data.classified ?? 0} classified`;
		case "embed":
			return `${data.embedded ?? 0} embedded`;
		case "cluster":
			return `${data.clusters ?? 0} clusters`;
		case "generate":
			return `${data.playlists ?? 0} playlists`;
		default:
			return "Processing...";
	}
}
