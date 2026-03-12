"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DASHBOARD_ROUTES } from "@harmonia/common/utils/routes";
import { orpc } from "@/lib/orpc";
import { Icons } from "@harmonia/ui";
import { useQueryClient } from "@tanstack/react-query";

export default function SyncPage() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const [isComplete, setIsComplete] = useState(false);

	const { mutate: syncLibrary, isPending } =
		orpc.spotify.syncLibrary.useMutation({
			onSuccess: () => {
				setIsComplete(true);
				// Invalidate session to update hasCompletedOnboarding
				router.refresh();
				setTimeout(() => {
					router.push(DASHBOARD_ROUTES.overview.path);
				}, 1000);
			},
			onError: (error) => {
				console.error("Sync failed", error);
				// Still redirect on error for now, or show error state
				router.push(DASHBOARD_ROUTES.overview.path);
			},
		});

	// Poll for stats while syncing to show some activity
	const { data: stats } = orpc.spotify.libraryStats.useQuery(
		{ input: {} },
		{
			enabled: isPending,
			refetchInterval: 2000,
		},
	);

	useEffect(() => {
		syncLibrary({ input: {} });
	}, [syncLibrary]);

	return (
		<div className="flex flex-col items-start gap-8 w-full max-w-md">
			<div className="space-y-2">
				<h1 className="text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
					Importing your Spotify library...
				</h1>
				<p className="text-muted-foreground">
					Harmonia is collecting your music. This may take a moment depending on
					the size of your library.
				</p>
			</div>

			<div className="w-full space-y-6">
				{/* Progress Indicator */}
				<div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
					<div
						className="h-full bg-primary transition-all duration-500 ease-in-out"
						style={{
							width: isComplete ? "100%" : isPending ? "65%" : "0%",
						}}
					/>
				</div>

				<div className="space-y-4">
					<div className="flex items-center gap-3">
						{stats?.totalTracks ? (
							<Icons.check className="h-5 w-5 text-primary" />
						) : (
							<Icons.spinner className="h-5 w-5 animate-spin text-muted-foreground" />
						)}
						<span className="text-sm font-medium">Collecting liked songs</span>
					</div>

					<div className="flex items-center gap-3">
						{stats?.totalPlaylists ? (
							<Icons.check className="h-5 w-5 text-primary" />
						) : (
							<div className="h-5 w-5" /> // Placeholder
						)}
						<span className="text-sm font-medium">Collecting playlists</span>
					</div>

					<div className="flex items-center gap-3">
						{isComplete ? (
							<Icons.check className="h-5 w-5 text-primary" />
						) : (
							<div className="h-5 w-5" /> // Placeholder
						)}
						<span className="text-sm font-medium">
							Preparing songs for analysis
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}
