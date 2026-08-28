"use client";

import type { AdminCostsCall, AdminCostsStage } from "@harmonia/common/schemas";
import {
	Badge,
	Button,
	ScrollArea,
	Separator,
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@harmonia/ui";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

import { orpc } from "@/shared/api/orpc";

const STATUS_VARIANTS = {
	completed: "default",
	failed: "destructive",
	partial: "secondary",
	running: "secondary",
	pending: "secondary",
	cancelled: "outline",
} as const;

function formatCost(value: number | null): string {
	if (value == null) return "—";
	return `$${value.toFixed(4)}`;
}

function formatDuration(ms: number | null): string {
	if (ms == null) return "—";
	return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
	return (
		<p className="mb-2 font-semibold text-[10px] text-muted-foreground uppercase tracking-widest">
			{children}
		</p>
	);
}

function CallRow({ call }: { call: AdminCostsCall }) {
	return (
		<div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-xs">
			<div className="flex min-w-0 flex-col gap-0.5">
				<div className="flex items-center gap-1.5">
					<span className="font-medium">{call.provider}</span>
					<span className="truncate text-muted-foreground">
						{call.endpoint}
					</span>
				</div>
				<div className="flex items-center gap-2 text-muted-foreground">
					<span>{format(new Date(call.createdAt), "HH:mm:ss")}</span>
					<span>{formatDuration(call.durationMs)}</span>
					{call.retryAttempt > 0 && <span>retry {call.retryAttempt}</span>}
					{(call.inputTokens != null || call.outputTokens != null) && (
						<span>
							{call.inputTokens ?? 0} in / {call.outputTokens ?? 0} out
						</span>
					)}
				</div>
				{call.errorMessage && (
					<span className="truncate text-destructive">{call.errorMessage}</span>
				)}
			</div>
			<span className="shrink-0 font-medium">{formatCost(call.costUsd)}</span>
		</div>
	);
}

function StageSection({ stage }: { stage: AdminCostsStage }) {
	const stageCost = stage.calls.reduce((sum, c) => sum + (c.costUsd ?? 0), 0);
	const stageDurationMs =
		new Date(stage.completedAt).getTime() - new Date(stage.startedAt).getTime();

	return (
		<div>
			<div className="mb-2 flex items-baseline justify-between">
				<SectionHeading>{stage.stage}</SectionHeading>
				<span className="text-muted-foreground text-xs">
					{formatDuration(stageDurationMs)}
					{stage.trackCount != null && ` · ${stage.trackCount} tracks`}
					{stageCost > 0 && ` · ${formatCost(stageCost)}`}
				</span>
			</div>
			{stage.calls.length > 0 ? (
				<div className="space-y-1.5">
					{stage.calls.map((call) => (
						<CallRow key={call.id} call={call} />
					))}
				</div>
			) : (
				<p className="text-muted-foreground text-xs">No API calls logged</p>
			)}
		</div>
	);
}

type AdminCostsDetailSheetProps = {
	runId: number | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function AdminCostsDetailSheet({
	runId,
	open,
	onOpenChange,
}: AdminCostsDetailSheetProps) {
	const { data, isFetching, isError, refetch } = useQuery(
		orpc.admin.costs.detail.queryOptions({
			input: { runId: runId ?? -1 },
			enabled: open && runId != null,
		}),
	);

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="flex flex-col gap-0 p-0 sm:max-w-[480px]">
				<SheetHeader className="border-b px-5 py-4">
					<SheetTitle>Run #{runId}</SheetTitle>
					<SheetDescription className="truncate font-mono text-xs">
						{data?.userEmail ?? "—"}
					</SheetDescription>
				</SheetHeader>

				{open && runId != null && isError && !data ? (
					<div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
						<p className="text-muted-foreground text-sm">Failed to load run</p>
						<Button variant="link" size="sm" onClick={() => refetch()}>
							Retry
						</Button>
					</div>
				) : data && !isFetching ? (
					<ScrollArea className="min-h-0 flex-1">
						<div className="space-y-5 px-5 py-4">
							<div>
								<SectionHeading>Summary</SectionHeading>
								<div className="flex flex-wrap items-center gap-2">
									<Badge
										variant={
											STATUS_VARIANTS[
												data.status as keyof typeof STATUS_VARIANTS
											] ?? "outline"
										}
									>
										{data.status}
									</Badge>
									{data.triggeredBy && (
										<Badge variant="secondary">{data.triggeredBy}</Badge>
									)}
									<span className="text-muted-foreground text-xs">
										{data.startedAt
											? format(new Date(data.startedAt), "d MMM yyyy, HH:mm")
											: "—"}
									</span>
									<span className="ml-auto font-medium text-sm">
										{formatCost(data.totalCostUsd)}
									</span>
								</div>
								{data.error && (
									<p className="mt-2 text-destructive text-xs">{data.error}</p>
								)}
							</div>

							<Separator />

							{data.stages.map((stage) => (
								<StageSection key={stage.stage} stage={stage} />
							))}

							{data.ungroupedCalls.length > 0 && (
								<div>
									<SectionHeading>Other calls</SectionHeading>
									<div className="space-y-1.5">
										{data.ungroupedCalls.map((call) => (
											<CallRow key={call.id} call={call} />
										))}
									</div>
								</div>
							)}

							{data.stages.length === 0 && data.ungroupedCalls.length === 0 && (
								<p className="text-muted-foreground text-xs">
									No API calls logged for this run.
								</p>
							)}
						</div>
					</ScrollArea>
				) : (
					<div className="flex flex-1 items-center justify-center text-muted-foreground text-xs">
						{isFetching ? "Loading…" : "Select a run to view details"}
					</div>
				)}
			</SheetContent>
		</Sheet>
	);
}
