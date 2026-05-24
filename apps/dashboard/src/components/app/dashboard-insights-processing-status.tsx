import { Skeleton } from "@harmonia/ui";

type Status = {
	total: number;
	withLyrics: number;
	classified: number;
	embedded: number;
};

const BARS: { key: keyof Omit<Status, "total">; label: string }[] = [
	{ key: "withLyrics", label: "Lyrics collected" },
	{ key: "classified", label: "Tracks analyzed" },
	{ key: "embedded", label: "Tracks embedded" },
];

export function DashboardInsightsProcessingStatusSkeleton() {
	return (
		<div className="flex flex-col gap-5 border border-border bg-background p-5">
			<div className="flex items-center justify-between border-b border-border pb-3">
				<div className="flex items-center gap-2">
					<Skeleton className="size-1" />
					<Skeleton className="h-2 w-36" />
				</div>
				<Skeleton className="h-4 w-20" />
			</div>
			<div className="flex flex-col gap-3.5">
				{BARS.map(({ key }) => (
					<div key={key} className="flex flex-col gap-1.5">
						<Skeleton className="h-2 w-32" />
						<Skeleton className="h-1 w-full" />
					</div>
				))}
			</div>
		</div>
	);
}

export function DashboardInsightsProcessingStatus({
	status,
}: {
	status: Status;
}) {
	const isFullyProcessed =
		status.total > 0 &&
		status.withLyrics >= status.total &&
		status.classified >= status.total &&
		status.embedded >= status.total;

	return (
		<div className="flex flex-col gap-5 border border-border bg-background p-5">
			<div className="flex items-center justify-between border-b border-border pb-3">
				<div className="flex items-center gap-2">
					<span className="inline-block size-1 shrink-0 bg-primary" />
					<span className="font-bold font-mono text-[11px] uppercase tracking-widest text-foreground">
						Processing Status
					</span>
				</div>
				{isFullyProcessed && (
					<div className="flex items-center gap-1.5 border border-emerald-500 px-1.5 py-0.5">
						<span className="inline-block size-1 shrink-0 bg-emerald-500" />
						<span className="font-bold font-mono text-[9px] uppercase text-emerald-500">
							Complete
						</span>
					</div>
				)}
			</div>

			<div className="flex flex-col gap-3.5">
				{BARS.map(({ key, label }) => {
					const value = status[key];
					const pct = status.total > 0 ? (value / status.total) * 100 : 0;
					return (
						<div key={key} className="flex flex-col gap-1.5">
							<div className="flex justify-between text-[11px]">
								<span className="text-muted-foreground">{label}</span>
								<span className="font-bold text-foreground">
									{value.toLocaleString()} / {status.total.toLocaleString()}
								</span>
							</div>
							<div className="h-1 border border-border bg-muted">
								<div
									className="h-full bg-emerald-500"
									style={{ width: `${pct}%` }}
								/>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
