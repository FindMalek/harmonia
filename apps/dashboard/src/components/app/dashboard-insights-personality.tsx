import { Skeleton } from "@harmonia/ui";

type EraItem = { era: string; count: number };

type Props = {
	primaryMood: string | null;
	secondaryMood: string | null;
	favoriteEra: string | null;
	eraDistribution: EraItem[];
};

function toEraShort(era: string): string {
	const digits = era.replace(/\D/g, "");
	if (digits.length >= 4) return `${digits.slice(2, 4)}S`;
	return era.toUpperCase();
}

function InsightsCardTitle({ title }: { title: string }) {
	return (
		<div className="flex items-center gap-2 border-b border-border pb-3">
			<span className="inline-block size-1 shrink-0 bg-primary" />
			<span className="font-bold font-mono text-[11px] uppercase tracking-widest text-foreground">
				{title}
			</span>
		</div>
	);
}

function KvRow({
	label,
	value,
}: {
	label: string;
	value: string | null;
}) {
	return (
		<div className="flex items-center justify-between border-b border-border py-3 last:border-b-0">
			<span className="text-[11px] text-muted-foreground">{label}</span>
			<span className="font-bold capitalize text-foreground text-sm">
				{value ?? "—"}
			</span>
		</div>
	);
}

export function DashboardInsightsPersonalitySkeleton() {
	return (
		<div className="flex flex-col gap-5 border border-border bg-background p-5">
			<div className="flex items-center gap-2 border-b border-border pb-3">
				<Skeleton className="size-1" />
				<Skeleton className="h-2 w-32" />
			</div>
			{[1, 2, 3].map((i) => (
				<div
					key={i}
					className="flex items-center justify-between border-b border-border pb-3 last:border-b-0"
				>
					<Skeleton className="h-2 w-24" />
					<Skeleton className="h-4 w-20" />
				</div>
			))}
			<Skeleton className="h-16 w-full" />
		</div>
	);
}

export function DashboardInsightsPersonality({
	primaryMood,
	secondaryMood,
	favoriteEra,
	eraDistribution,
}: Props) {
	const maxCount = Math.max(...eraDistribution.map((e) => e.count), 1);

	return (
		<div className="flex flex-col gap-5 border border-border bg-background p-5">
			<InsightsCardTitle title="Music Personality" />

			<div>
				<KvRow label="Primary mood" value={primaryMood} />
				<KvRow label="Secondary mood" value={secondaryMood} />
				<KvRow label="Favorite era" value={favoriteEra} />
			</div>

			{eraDistribution.length > 0 && (
				<div className="flex flex-col gap-3">
					<span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
						Era Distribution
					</span>
					<div className="flex h-12 items-end gap-2">
						{eraDistribution.map(({ era, count }) => (
							<div key={era} className="flex flex-1 flex-col items-center gap-1">
								<div
									className={`w-full ${count === maxCount ? "bg-foreground" : "bg-muted-foreground/40"}`}
									style={{ height: `${(count / maxCount) * 100}%` }}
								/>
								<span className="font-mono text-[8px] uppercase text-muted-foreground">
									{toEraShort(era)}
								</span>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
