import { InsightSectionCard, Skeleton } from "@harmonia/ui";

type Coverage = {
	percentage: number;
	coveredTracks: number;
	totalTracks: number;
	totalPlaylists: number;
	exportedPlaylists: number;
	avgTracksPerPlaylist: number;
};

export function DashboardInsightsPlaylistCoverageSkeleton() {
	return (
		<div className="flex flex-col gap-5 border border-border bg-background p-5">
			<div className="border-b border-border pb-3">
				<Skeleton className="h-2 w-32" />
			</div>
			<div className="flex items-center gap-5">
				<Skeleton className="size-20 rounded-full" />
				<div className="flex flex-1 flex-col gap-2">
					{[1, 2, 3].map((i) => (
						<div key={i} className="flex justify-between">
							<Skeleton className="h-2 w-24" />
							<Skeleton className="h-2 w-10" />
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

export function DashboardInsightsPlaylistCoverage({
	coverage,
}: {
	coverage: Coverage;
}) {
	const pct = Math.round(coverage.percentage);
	const ringStyle = {
		background: `conic-gradient(var(--primary) 0% ${pct}%, var(--muted) ${pct}% 100%)`,
	};

	return (
		<InsightSectionCard title="Playlist Coverage">
			<div className="flex items-center gap-5">
				<div
					className="flex size-20 shrink-0 items-center justify-center rounded-full"
					style={ringStyle}
				>
					<div className="flex size-[58px] items-center justify-center rounded-full bg-background text-[11px] text-foreground">
						{pct}%
					</div>
				</div>

				<div className="flex flex-1 flex-col gap-2">
					{[
						{
							label: "Covered tracks",
							value: `${coverage.coveredTracks.toLocaleString()} / ${coverage.totalTracks.toLocaleString()}`,
						},
						{ label: "Playlists", value: coverage.totalPlaylists },
						{ label: "Exported", value: coverage.exportedPlaylists },
						{
							label: "Avg tracks",
							value: Math.round(coverage.avgTracksPerPlaylist),
						},
					].map(({ label, value }) => (
						<div key={label} className="flex justify-between text-[11px]">
							<span className="text-muted-foreground">{label}</span>
							<span className="text-foreground">{value}</span>
						</div>
					))}
				</div>
			</div>
		</InsightSectionCard>
	);
}
