"use client";

import {
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Skeleton,
} from "@harmonia/ui";
import { CopyableError } from "@/components/shared/copyable-error";
import { ErrorState } from "@/components/shared/error-state";
import { useClearAnalysis } from "@/hooks/mutations/use-clear-analysis";
import { useOrganize } from "@/hooks/mutations/use-organize";
import {
	usePipelineRuns,
	usePipelineStats,
} from "@/hooks/queries/use-pipeline";
import { useSpotifyLinked } from "@/hooks/queries/use-spotify-linked";
import { authClient } from "@/lib/auth-client";
import { env } from "@/lib/env";
import { Icons } from "@harmonia/ui";

export function DashboardOverview() {
	const { data: spotifyData } = useSpotifyLinked();
	const { data: runs } = usePipelineRuns();
	const {
		data: stats,
		isLoading: statsLoading,
		isError: statsError,
		error: statsErrorMessage,
		refetch: refetchStats,
	} = usePipelineStats(runs?.[0]?.status === "running" ? 3000 : false);

	const organizeMutation = useOrganize();
	const clearAnalysisMutation = useClearAnalysis();

	const handleClearAnalysis = () => {
		if (
			window.confirm(
				"This will remove all AI classification, embeddings, clusters, and generated playlists. You can re-run the pipeline to regenerate. Continue?",
			)
		) {
			clearAnalysisMutation.mutate({});
		}
	};

	const showLinkSpotify = spotifyData?.hasSpotify === false;
	const hasAnalysis =
		(stats?.tracks.classified ?? 0) > 0 || (stats?.clusters ?? 0) > 0;
	const lastRun = runs?.[0];

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="font-semibold text-base">Overview</h2>
					<p className="text-muted-foreground text-xs">
						Pipeline status and quick actions
					</p>
				</div>
				<div className="flex gap-2">
					{showLinkSpotify && (
						<Button
							variant="outline"
							size="sm"
							onClick={() => {
								authClient.signIn.social({
									provider: "spotify",
									callbackURL:
										(env.NEXT_PUBLIC_DASHBOARD_URL?.replace(/\/$/, "") ||
											(typeof window !== "undefined"
												? window.location.origin
												: "")) + "/dashboard",
								});
							}}
						>
							Link Spotify
						</Button>
					)}
					{hasAnalysis && (
						<Button
							variant="outline"
							size="sm"
							className="text-destructive hover:bg-destructive/10"
							onClick={handleClearAnalysis}
							disabled={clearAnalysisMutation.isPending}
						>
							{clearAnalysisMutation.isPending ? (
								<>
									<Icons.spinner className="size-3.5 animate-spin" />
									Clearing...
								</>
							) : (
								<>
									<Icons.trash className="size-3.5" />
									Remove Analysis
								</>
							)}
						</Button>
					)}
					<Button
						size="sm"
						onClick={() => organizeMutation.mutate({})}
						disabled={organizeMutation.isPending}
					>
						{organizeMutation.isPending ? (
							<>
								<Icons.spinner className="size-3.5 animate-spin" />
								Running...
							</>
						) : (
							"Run Pipeline"
						)}
					</Button>
				</div>
			</div>

			{statsError && (
				<ErrorState
					message={
						statsErrorMessage instanceof Error
							? statsErrorMessage.message
							: "Failed to load stats"
					}
					onRetry={() => refetchStats()}
				/>
			)}

			<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
				<StatCard
					icon={Icons.music}
					title="Total Tracks"
					value={stats?.tracks.total ?? 0}
					loading={statsLoading}
				/>
				<StatCard
					icon={Icons.fileText}
					title="Lyrics Found"
					value={stats?.tracks.withLyrics ?? 0}
					loading={statsLoading}
				/>
				<StatCard
					icon={Icons.brain}
					title="AI Classified"
					value={stats?.tracks.classified ?? 0}
					loading={statsLoading}
				/>
				<StatCard
					icon={Icons.layers}
					title="Clusters"
					value={stats?.clusters ?? 0}
					loading={statsLoading}
				/>
			</div>

			{lastRun && (
				<Card>
					<CardHeader>
						<CardTitle>Last Pipeline Run</CardTitle>
						<CardDescription>
							Run #{lastRun.id} &mdash;{" "}
							<span
								className={
									lastRun.status === "completed"
										? "text-green-600"
										: lastRun.status === "failed"
											? "text-red-500"
											: "text-yellow-500"
								}
							>
								{lastRun.status}
							</span>
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="text-muted-foreground text-xs">
							{lastRun.currentStage && (
								<p>
									Current stage:{" "}
									<span className="font-medium text-foreground">
										{lastRun.currentStage}
									</span>
								</p>
							)}
							{lastRun.startedAt && (
								<p>Started: {new Date(lastRun.startedAt).toLocaleString()}</p>
							)}
							{lastRun.completedAt && (
								<p>
									Completed: {new Date(lastRun.completedAt).toLocaleString()}
								</p>
							)}
							{lastRun.error && (
								<div className="mt-2">
									<CopyableError
										text={lastRun.error}
										variant="error"
										className="text-xs"
									/>
								</div>
							)}
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}

function StatCard({
	icon: Icon,
	title,
	value,
	loading,
}: {
	icon: React.ComponentType<{ className?: string }>;
	title: string;
	value: number;
	loading: boolean;
}) {
	return (
		<Card className="transition-all duration-200 hover:shadow-md">
			<CardContent className="pt-4">
				<div className="flex items-center gap-2">
					<Icon className="text-muted-foreground size-4 shrink-0" />
					<p className="text-muted-foreground text-xs">{title}</p>
				</div>
				{loading ? (
					<Skeleton className="mt-1 h-8 w-16" />
				) : (
					<p className="font-semibold text-2xl tabular-nums">
						{value.toLocaleString()}
					</p>
				)}
			</CardContent>
		</Card>
	);
}
