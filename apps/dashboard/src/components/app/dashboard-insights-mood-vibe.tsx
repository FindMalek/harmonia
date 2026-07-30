import { InsightSectionCard, Skeleton } from "@harmonia/ui";

type MoodItem = { mood: string; count: number; percentage: number };

type Props = {
	moodDistribution: MoodItem[];
	topVibes: string[];
};

export function DashboardInsightsMoodVibeSkeleton() {
	return (
		<div className="flex flex-col gap-5 border border-border bg-background p-5">
			<div className="border-border border-b pb-3">
				<Skeleton className="h-2 w-28" />
			</div>
			<div className="flex flex-col gap-3">
				{[80, 65, 50, 40, 30].map((w) => (
					<div key={w} className="flex items-center gap-3">
						<Skeleton className="h-2 w-[100px]" />
						<Skeleton className="h-2 flex-1" />
						<Skeleton className="h-2 w-9" />
					</div>
				))}
			</div>
			<div className="flex flex-wrap gap-2">
				{[60, 80, 50, 70, 55].map((w) => (
					<Skeleton key={w} className="h-7" style={{ width: w }} />
				))}
			</div>
		</div>
	);
}

export function DashboardInsightsMoodVibe({
	moodDistribution,
	topVibes,
}: Props) {
	return (
		<InsightSectionCard title="Mood & Vibe">
			{moodDistribution.length > 0 && (
				<div className="flex flex-col gap-3">
					{moodDistribution.map(({ mood, percentage }) => (
						<div key={mood} className="flex items-center gap-3">
							<span className="w-[100px] shrink-0 truncate text-[11px] text-muted-foreground lowercase">
								{mood}
							</span>
							<div className="h-2 flex-1 border border-border bg-muted">
								<div
									className="h-full bg-accent"
									style={{ width: `${percentage}%` }}
								/>
							</div>
							<span className="w-9 text-right text-[11px] text-foreground">
								{Math.round(percentage)}%
							</span>
						</div>
					))}
				</div>
			)}

			{topVibes.length > 0 && (
				<div className="flex flex-wrap gap-2">
					{topVibes.map((vibe) => (
						<span
							key={vibe}
							className="border border-border bg-muted px-2.5 py-1.5 text-[11px] text-foreground lowercase"
						>
							<span className="text-accent">#</span>
							{vibe}
						</span>
					))}
				</div>
			)}
		</InsightSectionCard>
	);
}
