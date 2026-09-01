import { InsightSectionCard, Skeleton } from "@sonaraem/ui";

type EraItem = { era: string; count: number };

type Props = {
	primaryMood: string | null;
	secondaryMood: string | null;
	favoriteEra: string | null;
	eraDistribution: EraItem[];
};

function eraDigits(era: string): string {
	return era.replace(/\D/g, "").slice(2, 4);
}

function KvRow({ label, value }: { label: string; value: string | null }) {
	return (
		<div className="flex items-center justify-between border-border border-b py-3 last:border-b-0">
			<span className="text-[11px] text-muted-foreground">{label}</span>
			<span className="text-foreground text-sm capitalize">{value ?? "—"}</span>
		</div>
	);
}

export function DashboardInsightsPersonalitySkeleton() {
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
		<InsightSectionCard title="Music Personality">
			<div>
				<KvRow label="Primary mood" value={primaryMood} />
				<KvRow label="Secondary mood" value={secondaryMood} />
				<KvRow label="Favorite era" value={favoriteEra} />
			</div>

			{eraDistribution.length > 0 && (
				<div className="flex flex-col gap-2">
					<span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">
						Era Distribution
					</span>
					<div className="flex h-12 items-end gap-1">
						{eraDistribution.map(({ era, count }) => (
							<div
								key={era}
								className={`flex-1 ${count === maxCount ? "bg-primary" : "bg-muted"}`}
								style={{
									height: `${Math.max(2, Math.round((count / maxCount) * 48))}px`,
								}}
							/>
						))}
					</div>
					<div className="flex gap-1">
						{eraDistribution.map(({ era }) => (
							<span
								key={era}
								className="flex-1 text-center font-mono text-[9px] text-muted-foreground"
							>
								{eraDigits(era)}
								<span className="align-top text-[6px]">s</span>
							</span>
						))}
					</div>
				</div>
			)}
		</InsightSectionCard>
	);
}
