import { Skeleton } from "@harmonia/ui";

type Props = {
	totalTracks: number;
	uniqueArtists: number;
	genreDomains: number;
	generatedPlaylists: number;
};

const STAT_LABELS = ["Tracks", "Artists", "Domains", "Playlists"] as const;

function StatCard({
	label,
	value,
	index,
}: {
	label: string;
	value: number;
	index: string;
}) {
	return (
		<div className="flex flex-col gap-2 border border-border bg-background p-4">
			<div className="flex items-center justify-between">
				<span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
					{label}
				</span>
				<span className="font-mono text-[9px] text-muted-foreground opacity-60">
					{index}
				</span>
			</div>
			<span className="font-bold text-[22px] leading-none">
				{value.toLocaleString()}
			</span>
		</div>
	);
}

export function DashboardInsightsStatsGridSkeleton() {
	return (
		<div className="grid grid-cols-2 gap-3">
			{STAT_LABELS.map((label) => (
				<div key={label} className="flex flex-col gap-2 border border-border p-4">
					<Skeleton className="h-2 w-16" />
					<Skeleton className="h-6 w-20" />
				</div>
			))}
		</div>
	);
}

export function DashboardInsightsStatsGrid({
	totalTracks,
	uniqueArtists,
	genreDomains,
	generatedPlaylists,
}: Props) {
	const stats = [totalTracks, uniqueArtists, genreDomains, generatedPlaylists];

	return (
		<div className="grid grid-cols-2 gap-3">
			{STAT_LABELS.map((label, i) => (
				<StatCard
					key={label}
					label={label}
					value={stats[i] ?? 0}
					index={`[0${i + 1}]`}
				/>
			))}
		</div>
	);
}
