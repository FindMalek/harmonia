import { InsightStatCard, Skeleton } from "@sonaraem/ui";

type Props = {
	totalTracks: number;
	uniqueArtists: number;
	genreDomains: number;
	generatedPlaylists: number;
};

const STAT_LABELS = ["Tracks", "Artists", "Domains", "Playlists"] as const;

export function DashboardInsightsStatsGridSkeleton() {
	return (
		<div className="grid grid-cols-2 gap-3">
			{STAT_LABELS.map((label) => (
				<div
					key={label}
					className="flex flex-col gap-2 border border-border p-4"
				>
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
				<InsightStatCard
					key={label}
					label={label}
					value={stats[i] ?? 0}
					index={`[0${i + 1}]`}
				/>
			))}
		</div>
	);
}
