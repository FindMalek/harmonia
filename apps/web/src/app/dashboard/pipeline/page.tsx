"use client";

import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { orpc } from "@/utils/orpc";
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
	const { data: runs, isLoading } = useQuery(
		orpc.pipeline.getAll.queryOptions(),
	);

	if (isLoading) {
		return (
			<div className="text-muted-foreground text-xs">
				Loading pipeline runs...
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

			{activeRun && <ActiveRunCard run={activeRun} />}

			<div>
				<h3 className="mb-3 font-medium text-sm">Run History</h3>
				<div className="space-y-2">
					{runs?.map((run) => (
						<RunRow key={run.id} run={run} />
					))}
					{(!runs || runs.length === 0) && (
						<p className="text-muted-foreground text-xs">
							No pipeline runs yet. Click "Run Pipeline" on the overview page.
						</p>
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
	run,
}: {
	run: {
		id: number;
		status: string;
		currentStage: string | null;
		progress: unknown;
		startedAt: Date | string | null;
	};
}) {
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
						const stageData = progress[stage];
						const isComplete = idx < currentStageIdx;
						const isCurrent = idx === currentStageIdx;
						const isPending = idx > currentStageIdx;

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
									value={isComplete ? 100 : isCurrent ? 50 : isPending ? 0 : 0}
									className="h-1"
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

	return (
		<div className="flex items-center justify-between border-b py-2 text-xs last:border-b-0">
			<div className="flex items-center gap-3">
				<span className="font-mono text-muted-foreground">#{run.id}</span>
				<span className={`font-medium ${statusColor}`}>{run.status}</span>
				{run.currentStage && run.status === "running" && (
					<span className="text-muted-foreground">
						{STAGE_LABELS[run.currentStage]}
					</span>
				)}
			</div>
			<div className="flex items-center gap-3 text-muted-foreground">
				{duration !== null && <span>{duration}s</span>}
				{run.startedAt && (
					<span>{new Date(run.startedAt).toLocaleString()}</span>
				)}
			</div>
		</div>
	);
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
