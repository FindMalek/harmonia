"use client";

import type { ChartConfig } from "@harmonia/ui";
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	InsightSectionCard,
	Skeleton,
} from "@harmonia/ui";
import { Cell, Pie, PieChart } from "recharts";

type GenreItem = { name: string; count: number; percentage: number };

const CHART_COLORS = [
	"var(--chart-1)",
	"var(--chart-2)",
	"var(--chart-3)",
	"var(--chart-4)",
	"var(--chart-5)",
	"var(--muted-foreground)",
] as const;

export function DashboardInsightsGenreBreakdownSkeleton() {
	return (
		<div className="flex flex-col gap-5 border border-border bg-background p-5">
			<div className="border-border border-b pb-3">
				<Skeleton className="h-2 w-32" />
			</div>
			<div className="flex flex-col items-center gap-5">
				<Skeleton className="size-[140px] rounded-full" />
				<div className="w-full space-y-2">
					{[1, 2, 3, 4].map((i) => (
						<div
							key={i}
							className="flex justify-between border-border border-b pb-2 last:border-b-0 last:pb-0"
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

	const chartConfig: ChartConfig = Object.fromEntries(
		genreBreakdown.map((g, i) => [
			`genre${i}`,
			{ label: g.name, color: CHART_COLORS[i % CHART_COLORS.length] },
		]),
	);

	const chartData = genreBreakdown.map((g, i) => ({
		...g,
		key: `genre${i}`,
		fill: CHART_COLORS[i % CHART_COLORS.length],
	}));

	return (
		<InsightSectionCard title="Genre Breakdown">
			<div className="flex flex-col items-center gap-5">
				<div className="relative size-[140px]">
					<ChartContainer config={chartConfig} className="size-[140px]">
						<PieChart>
							<ChartTooltip
								content={<ChartTooltipContent nameKey="key" hideLabel />}
							/>
							<Pie
								data={chartData}
								dataKey="percentage"
								innerRadius="55%"
								outerRadius="100%"
								paddingAngle={1}
							>
								{chartData.map((entry) => (
									<Cell key={entry.key} fill={entry.fill} />
								))}
							</Pie>
						</PieChart>
					</ChartContainer>
					<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
						<span className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider">
							Genres
						</span>
						<span className="mt-0.5 text-foreground text-sm">
							{genreBreakdown.length}
						</span>
					</div>
				</div>

				<div className="w-full">
					{genreBreakdown.map((g, i) => (
						<div
							key={g.name}
							className="flex items-center justify-between border-border border-b py-2 text-[11px] last:border-b-0 last:pb-0"
						>
							<div className="flex items-center gap-2.5">
								<span
									className="inline-block size-1.5"
									style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
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
