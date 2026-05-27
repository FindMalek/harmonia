import { InsightSectionCard, Skeleton } from "@harmonia/ui";

type GenreItem = { name: string; count: number; percentage: number };

export function DashboardInsightsGenreBreakdownSkeleton() {
	return (
		<div className="flex flex-col gap-5 border border-border bg-background p-5">
			<div className="border-b border-border pb-3">
				<Skeleton className="h-2 w-32" />
			</div>
			<div className="flex flex-col items-center gap-5">
				<Skeleton className="size-[140px] rounded-full" />
				<div className="w-full space-y-2">
					{[1, 2, 3, 4].map((i) => (
						<div
							key={i}
							className="flex justify-between border-b border-border pb-2 last:border-b-0 last:pb-0"
						>
							<Skeleton className="h-2 w-24" />
							<Skeleton className="h-2 w-8" />
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

export function DashboardInsightsGenreBreakdown({
	genreBreakdown,
}: {
	genreBreakdown: GenreItem[];
}) {
	if (genreBreakdown.length === 0) return null;

	const totalTracks = genreBreakdown.reduce((acc, g) => acc + g.count, 0);

	return (
		<InsightSectionCard title="Genre Breakdown">
			<div className="flex flex-col items-center gap-5">
				<div className="flex size-[140px] items-center justify-center rounded-full">
					<div className="flex size-24 flex-col items-center justify-center rounded-full bg-background">
						<span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
							Genres
						</span>
						<span className="mt-0.5 text-[13px] text-foreground">
							{genreBreakdown.length}
						</span>
					</div>
				</div>

				<div className="w-full">
					{genreBreakdown.map((g, i) => (
						<div
							key={g.name}
							className="flex items-center justify-between border-b border-border py-2 text-[11px] last:border-b-0 last:pb-0"
						>
							<div className="flex items-center gap-2.5">
								<span
									className="inline-block size-1.5"
									style={{ background: GENRE_COLORS[i % GENRE_COLORS.length] }}
								/>
								<span className="text-foreground">{g.name}</span>
							</div>
							<span className="text-muted-foreground">
								{g.count.toLocaleString()}
							</span>
						</div>
					))}
					<div className="mt-2 flex justify-end font-mono text-[9px] text-muted-foreground">
						{totalTracks.toLocaleString()} total
					</div>
				</div>
			</div>
		</InsightSectionCard>
	);
}
