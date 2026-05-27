import { InsightSectionCard, Skeleton } from "@harmonia/ui";

type SonicDna = {
	valence: number | null;
	energy: number | null;
	danceability: number | null;
	acousticness: number | null;
	instrumentalness: number | null;
	speechiness: number | null;
	liveness: number | null;
};

const DNA_FEATURES: { key: keyof SonicDna; label: string }[] = [
	{ key: "valence", label: "Valence" },
	{ key: "energy", label: "Energy" },
	{ key: "danceability", label: "Danceability" },
	{ key: "acousticness", label: "Acousticness" },
	{ key: "instrumentalness", label: "Instrumentalness" },
	{ key: "speechiness", label: "Speechiness" },
	{ key: "liveness", label: "Liveness" },
];

export function DashboardInsightsSonicDnaSkeleton() {
	return (
		<div className="flex flex-col gap-5 border border-border bg-background p-5">
			<div className="border-b border-border pb-3">
				<Skeleton className="h-2 w-24" />
			</div>
			<div className="flex flex-col gap-3.5">
				{DNA_FEATURES.map(({ key }) => (
					<div key={key} className="flex flex-col gap-1.5">
						<Skeleton className="h-2 w-32" />
						<Skeleton className="h-1 w-full" />
					</div>
				))}
			</div>
		</div>
	);
}

export function DashboardInsightsSonicDna({ dna }: { dna: SonicDna }) {
	return (
		<InsightSectionCard title="Sonic DNA">
			<div className="flex flex-col gap-3.5">
				{DNA_FEATURES.map(({ key, label }) => {
					const val = dna[key] ?? 0;
					return (
						<div key={key} className="flex flex-col gap-1.5">
							<div className="flex justify-between text-[11px]">
								<span className="text-muted-foreground">{label}</span>
								<span className="text-primary">{Math.round(val * 100)}%</span>
							</div>
							<div className="h-1 border border-border bg-muted">
								<div
									className="h-full bg-primary"
									style={{ width: `${val * 100}%` }}
								/>
							</div>
						</div>
					);
				})}
			</div>
		</InsightSectionCard>
	);
}
