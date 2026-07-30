import { InsightSectionCard, Skeleton } from "@harmonia/ui";

type Props = {
	topGenre: string | null;
	topThemes: string[];
	avgEnergy: number | null;
};

function KvRow({ label, value }: { label: string; value: string | null }) {
	return (
		<div className="flex items-center justify-between border-border border-b py-3 last:border-b-0">
			<span className="text-[11px] text-muted-foreground">{label}</span>
			<span className="text-foreground text-sm capitalize">{value ?? "—"}</span>
		</div>
	);
}

function energyLabel(energy: number): string {
	if (energy < 0.35) return "Low";
	if (energy < 0.65) return "Medium";
	return "High";
}

export function DashboardInsightsListeningSkeleton() {
	return (
		<div className="flex flex-col gap-5 border border-border bg-background p-5">
			<div className="border-border border-b pb-3">
				<Skeleton className="h-2 w-32" />
			</div>
			{[1, 2, 3].map((i) => (
				<div
					key={i}
					className="flex items-center justify-between border-border border-b pb-3 last:border-b-0"
				>
					<Skeleton className="h-2 w-28" />
					<Skeleton className="h-4 w-24" />
				</div>
			))}
			<Skeleton className="h-4 w-full" />
		</div>
	);
}

export function DashboardInsightsListening({
	topGenre,
	topThemes,
	avgEnergy,
}: Props) {
	const themesString = topThemes.length > 0 ? topThemes.join(" and ") : null;
	const energy = avgEnergy ?? 0;

	return (
		<InsightSectionCard title="Listening Patterns">
			<div>
				<KvRow label="Most common genre" value={topGenre} />
				<KvRow label="Common themes" value={themesString} />
				<KvRow
					label="Average song energy"
					value={avgEnergy !== null ? energyLabel(energy) : null}
				/>
			</div>

			{avgEnergy !== null && (
				<div className="flex flex-col gap-2">
					<div className="relative h-[3px] border border-border bg-muted">
						<div
							className="h-full bg-primary"
							style={{ width: `${energy * 100}%` }}
						/>
						<div
							className="absolute top-1/2 h-3.5 w-px -translate-y-1/2 bg-foreground"
							style={{ left: `${energy * 100}%` }}
						/>
					</div>
					<div className="flex justify-between font-mono text-[9px] text-muted-foreground uppercase tracking-widest">
						<span>Low</span>
						<span>High</span>
					</div>
				</div>
			)}
		</InsightSectionCard>
	);
}
