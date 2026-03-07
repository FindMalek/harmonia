"use client";

import {
	Badge,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	Skeleton,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@harmonia/ui";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Icons } from "@harmonia/ui";
import { DASHBOARD_ROUTES } from "@harmonia/common/utils/routes";
import { useClusters, useClusterDetail } from "@/hooks/queries/use-clusters";
import { useDashboardUI } from "@/stores/dashboard-ui";

export default function ClustersPage() {
	const selectedClusterId = useDashboardUI((s) => s.selectedClusterId);
	const setSelectedCluster = useDashboardUI((s) => s.setSelectedCluster);

	const { data: clusters, isLoading, isError, error, refetch } = useClusters();
	const { data: clusterDetail } = useClusterDetail(selectedClusterId);

	if (isError) {
		return (
			<div className="space-y-4">
				<div>
					<h2 className="font-semibold text-base">Clusters</h2>
					<p className="text-muted-foreground text-xs">
						Clusters discovered from your library
					</p>
				</div>
				<ErrorState
					message={
						error instanceof Error ? error.message : "Failed to load clusters"
					}
					onRetry={() => refetch()}
				/>
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className="space-y-4">
				<div>
					<h2 className="font-semibold text-base">Clusters</h2>
					<p className="text-muted-foreground text-xs">
						Clusters discovered from your library
					</p>
				</div>
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{Array.from({ length: 6 }).map((_, i) => (
						<ClusterCardSkeleton key={i} />
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div>
				<h2 className="font-semibold text-base">Clusters</h2>
				<p className="text-muted-foreground text-xs">
					{clusters?.length ?? 0} clusters discovered
				</p>
			</div>

			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{clusters?.map((c) => {
					const meta = c.metadata as {
						themeSummary?: string;
						dominantMood?: string;
						dominantEnergy?: string;
						topThemes?: string[];
						topVibes?: string[];
						suggestedArchetype?: string;
					} | null;

					return (
						<Card
							key={c.id}
							className={`cursor-pointer transition-all duration-200 hover:bg-muted/50 hover:shadow-md ${
								selectedClusterId === c.id ? "ring-2 ring-primary" : ""
							}`}
							onClick={() => setSelectedCluster(c.id)}
						>
							<CardHeader>
								<div className="flex items-center justify-between">
									<CardTitle className="text-sm">Cluster #{c.id}</CardTitle>
									<Badge variant="secondary" className="text-[10px]">
										{c.size} tracks
									</Badge>
								</div>
								{meta?.themeSummary && (
									<CardDescription className="line-clamp-2">
										{meta.themeSummary}
									</CardDescription>
								)}
							</CardHeader>
							<CardContent>
								<div className="flex flex-wrap gap-1">
									{meta?.dominantMood && (
										<Badge variant="outline" className="text-[10px]">
											{meta.dominantMood}
										</Badge>
									)}
									{meta?.dominantEnergy && (
										<Badge variant="outline" className="text-[10px]">
											{meta.dominantEnergy}
										</Badge>
									)}
									{meta?.suggestedArchetype && (
										<Badge variant="secondary" className="text-[10px]">
											{meta.suggestedArchetype}
										</Badge>
									)}
								</div>
								{meta?.topThemes && meta.topThemes.length > 0 && (
									<p className="mt-2 text-[11px] text-muted-foreground">
										{meta.topThemes.join(", ")}
									</p>
								)}
							</CardContent>
						</Card>
					);
				})}
			</div>

			{!clusters?.length && (
				<EmptyState
					icon={Icons.layers}
					title="No clusters yet"
					description="Run the pipeline to discover clusters in your library."
					action={{
						label: "Run Pipeline",
						onClick: () =>
							(window.location.href = DASHBOARD_ROUTES.overview.path),
					}}
					variant="card"
				/>
			)}

			<Sheet
				open={selectedClusterId !== null && !!clusterDetail}
				onOpenChange={(open) => !open && setSelectedCluster(null)}
			>
				<SheetContent side="right" className="w-full max-w-md sm:max-w-lg">
					{clusterDetail && (
						<div className="flex flex-col gap-4">
							<SheetHeader>
								<SheetTitle className="text-sm">
									Cluster #{clusterDetail.id} &mdash; Tracks
								</SheetTitle>
								<p className="text-muted-foreground text-xs">
									{clusterDetail.tracks?.length ?? 0} tracks in this cluster
								</p>
							</SheetHeader>
							<div className="max-h-[400px] overflow-auto">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="text-xs">#</TableHead>
											<TableHead className="text-xs">Track</TableHead>
											<TableHead className="text-xs">Artist</TableHead>
											<TableHead className="text-xs">Mood</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{clusterDetail.tracks?.map((t) => {
											const artists = safeParseArray(t.artistNames);
											return (
												<TableRow key={t.id}>
													<TableCell className="text-muted-foreground text-xs">
														{(t.position ?? 0) + 1}
													</TableCell>
													<TableCell className="font-medium text-xs">
														{t.name}
													</TableCell>
													<TableCell className="text-muted-foreground text-xs">
														{artists.join(", ")}
													</TableCell>
													<TableCell className="text-muted-foreground text-xs">
														{t.llmMood ?? "—"}
													</TableCell>
												</TableRow>
											);
										})}
									</TableBody>
								</Table>
							</div>
						</div>
					)}
				</SheetContent>
			</Sheet>
		</div>
	);
}

function ClusterCardSkeleton() {
	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-5 w-16" />
				</div>
				<Skeleton className="mt-2 h-3 w-full" />
				<Skeleton className="mt-1 h-3 w-48" />
			</CardHeader>
			<CardContent>
				<div className="flex flex-wrap gap-1">
					<Skeleton className="h-5 w-20" />
					<Skeleton className="h-5 w-16" />
				</div>
			</CardContent>
		</Card>
	);
}

function safeParseArray(json: string): string[] {
	try {
		const parsed = JSON.parse(json);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}
