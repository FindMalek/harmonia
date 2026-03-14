"use client";

import { Icons, Progress } from "@harmonia/ui";
import { useOnboardingSync } from "@/stores/onboarding-sync";
import { useOnboardingSyncStream } from "@/hooks/use-onboarding-sync-stream";

export default function SyncPage() {
	const isComplete = useOnboardingSync((state) => state.isComplete);
	const isSyncing = useOnboardingSync((state) => state.isSyncing);
	const { progress, phase, phasesCompleted } = useOnboardingSyncStream();

	const isIdle = !isSyncing && !isComplete && phasesCompleted === 0;
	const getStepState = (step: 1 | 2 | 3) => {
		if (step === 1) {
			if (phasesCompleted >= 1) return "complete";
			if (isSyncing && (phase === "liked" || phase === null)) return "active";
			return "idle";
		}

		if (step === 2) {
			if (phasesCompleted >= 2) return "complete";
			if (isSyncing && phasesCompleted < 1) return "idle";
			if (isSyncing && phase === "playlists") return "active";
			return "idle";
		}

		if (isComplete || phasesCompleted >= 3) return "complete";
		if (isSyncing && phasesCompleted < 2) return "idle";
		if (isSyncing && phase === "preparing") return "active";
		return "idle";
	};

	const renderStepIcon = (step: 1 | 2 | 3) => {
		const state = getStepState(step);

		if (state === "complete") {
			return <Icons.check className="h-5 w-5 text-primary" />;
		}

		if (state === "active") {
			return <Icons.spinner className="h-5 w-5 animate-spin" />;
		}

		return (
			<div className="h-5 w-5 rounded-full border border-border/70 bg-background" />
		);
	};

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
						{isIdle ? "0%" : `${progress}%`}
					</span>
				</div>
				<Progress value={progress} className="h-1" />
			</div>

			<div className="flex flex-col gap-3">
				<div className="flex items-center gap-4 p-4 rounded-md bg-card border border-border/50">
					{renderStepIcon(1)}
					<span className="text-sm font-medium">Collecting liked songs</span>
				</div>

				<div className="flex items-center gap-4 p-4 rounded-md bg-card border border-border/50">
					{renderStepIcon(2)}
					<span className="text-sm font-medium">Collecting playlists</span>
				</div>

				<div className="flex items-center gap-4 p-4 rounded-md bg-card border border-border/50">
					{renderStepIcon(3)}
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
