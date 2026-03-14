"use client";

import { Icons, Progress } from "@harmonia/ui";
import { useOnboardingSync } from "@/stores/onboarding-sync";
import { useOnboardingSyncStream } from "@/hooks/use-onboarding-sync-stream";

export default function SyncPage() {
	const isComplete = useOnboardingSync((state) => state.isComplete);
	const { progress, phasesCompleted } = useOnboardingSyncStream();

	return (
		<div className="flex flex-col w-full max-w-md gap-8">
			<div className="space-y-2">
				<h1 className="text-3xl font-semibold leading-tight tracking-tight text-foreground">
					Importing your Spotify library
				</h1>
				<p className="text-muted-foreground text-base">
					Harmonia is collecting your music so it can begin analyzing your
					library.
				</p>
			</div>

			<div className="space-y-3">
				<div className="flex justify-between items-end">
					<span className="text-xs font-semibold tracking-widest uppercase text-foreground">
						Overall Progress
					</span>
					<span className="text-sm font-medium text-foreground">
						{progress}%
					</span>
				</div>
				<Progress value={progress} className="h-1" />
			</div>

			<div className="flex flex-col gap-3">
				<div className="flex items-center gap-4 p-4 rounded-md bg-card border border-border/50">
					{phasesCompleted >= 1 ? (
						<Icons.check className="h-5 w-5 text-primary" />
					) : (
						<Icons.spinner className="h-5 w-5 animate-spin" />
					)}
					<span className="text-sm font-medium">Collecting liked songs</span>
				</div>

				<div className="flex items-center gap-4 p-4 rounded-md bg-card border border-border/50">
					{phasesCompleted >= 2 ? (
						<Icons.check className="h-5 w-5 text-primary" />
					) : (
						<Icons.spinner className="h-5 w-5 animate-spin" />
					)}
					<span className="text-sm font-medium">Collecting playlists</span>
				</div>

				<div className="flex items-center gap-4 p-4 rounded-md bg-card border border-border/50">
					{isComplete || phasesCompleted >= 3 ? (
						<Icons.check className="h-5 w-5 text-primary" />
					) : (
						<Icons.spinner className="h-5 w-5 animate-spin" />
					)}
					<span className="text-sm font-medium">
						Preparing songs for analysis
					</span>
				</div>
			</div>

			<p className="text-xs text-center text-muted-foreground mt-4">
				This may take a moment depending on the size of your library.
			</p>
		</div>
	);
}
