"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { env } from "@/lib/env";
import { orpc, queryClient } from "@/lib/orpc";

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
import { Icons } from "@harmonia/ui";

export function DashboardOverview() {
	const router = useRouter();
	const { data: spotifyData } = useQuery(orpc.hasSpotifyLinked.queryOptions());
	const { data: runs } = useQuery({
		...orpc.pipeline.getAll.queryOptions(),
		refetchInterval: (query) =>
			query.state.data?.some((r: { status: string }) => r.status === "running")
				? 2000
				: false,
		refetchIntervalInBackground: false,
	});
	const {
		data: stats,
		isLoading: statsLoading,
		isError: statsError,
		error: statsErrorMessage,
		refetch: refetchStats,
	} = useQuery({
		...orpc.pipeline.stats.queryOptions(),
		refetchInterval: runs?.[0]?.status === "running" ? 3000 : false,
		refetchIntervalInBackground: false,
	});

	const organizeMutation = useMutation(
		orpc.organize.run.mutationOptions({
			onSuccess: (data) => {
				toast.success(`Pipeline started (run #${data.runId})`);
				queryClient.invalidateQueries();
				router.push("/dashboard/pipeline" as Parameters<typeof router.push>[0]);
			},
			onError: (error) => {
				const msg = error.message ?? "Failed to start pipeline";
				const isSpotify403 = msg.includes("403") && msg.includes("Spotify");
				if (isSpotify403) {
					toast.error(
						"Spotify 403: re-authorize by signing out and back in with Spotify.",
						{
							action: {
								label: "Reconnect",
								onClick: async () => {
									await authClient.signOut();
									router.push("/login");
								},
							},
						},
					);
				} else {
					toast.error(msg, {
						action: {
							label: "Copy",
							onClick: async () => {
								try {
									await navigator.clipboard.writeText(msg);
									toast.success("Copied");
								} catch {
									toast.error("Failed to copy");
								}
							},
						},
					});
				}
			},
		}),
	);

	const clearAnalysisMutation = useMutation(
		orpc.pipeline.clearAnalysis.mutationOptions({
			onSuccess: (data) => {
				toast.success(`Analysis cleared (${data.tracksUpdated} tracks reset)`);
				queryClient.invalidateQueries();
			},
			onError: (error) => {
				const msg = error.message ?? "Failed to clear analysis";
				toast.error(msg, {
					action: {
						label: "Copy",
						onClick: async () => {
							try {
								await navigator.clipboard.writeText(msg);
								toast.success("Copied");
							} catch {
								toast.error("Failed to copy");
							}
						},
					},
				});
			},
		}),
	);

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
						onClick={() => organizeMutation.mutate({ userId: undefined })}
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
