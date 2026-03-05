"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export function DashboardOverview({
	spotifyEnabled = false,
}: {
	spotifyEnabled?: boolean;
}) {
	const router = useRouter();
	const { data: spotifyData } = useQuery(orpc.hasSpotifyLinked.queryOptions());
	const { data: stats, isLoading: statsLoading } = useQuery(
		orpc.pipeline.stats.queryOptions(),
	);
	const { data: runs } = useQuery(orpc.pipeline.getAll.queryOptions());

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
					toast.error(msg);
				}
			},
		}),
	);

	const showLinkSpotify = spotifyEnabled && spotifyData?.hasSpotify === false;
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
									callbackURL: "/dashboard",
								});
							}}
						>
							Link Spotify
						</Button>
					)}
					<Button
						size="sm"
						onClick={() => organizeMutation.mutate({ userId: undefined })}
						disabled={organizeMutation.isPending}
					>
						{organizeMutation.isPending ? "Running..." : "Run Pipeline"}
					</Button>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
				<StatCard
					title="Total Tracks"
					value={stats?.tracks.total ?? 0}
					loading={statsLoading}
				/>
				<StatCard
					title="Lyrics Found"
					value={stats?.tracks.withLyrics ?? 0}
					loading={statsLoading}
				/>
				<StatCard
					title="AI Classified"
					value={stats?.tracks.classified ?? 0}
					loading={statsLoading}
				/>
				<StatCard
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
								<p className="mt-1 text-red-500">{lastRun.error}</p>
							)}
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}

function StatCard({
	title,
	value,
	loading,
}: {
	title: string;
	value: number;
	loading: boolean;
}) {
	return (
		<Card>
			<CardContent className="pt-4">
				<p className="text-muted-foreground text-xs">{title}</p>
				<p className="font-semibold text-2xl tabular-nums">
					{loading ? "..." : value.toLocaleString()}
				</p>
			</CardContent>
		</Card>
	);
}
