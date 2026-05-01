"use client";

import { useOnboardingSyncStream } from "@/hooks/use-onboarding-sync-stream";
import { useOnboardingSync } from "@/stores/onboarding-sync";
import { Icons, Progress } from "@harmonia/ui";

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
		<div className="flex w-full max-w-md flex-col gap-8">
			<div className="space-y-2">
				<h1 className="font-semibold text-3xl text-foreground leading-tight tracking-tight">
					Importing your Spotify library
				</h1>
				<p className="text-base text-muted-foreground">
					Harmonia is collecting your music so it can begin analyzing your
					library.
				</p>
			</div>

			<div className="space-y-3">
				<div className="flex items-end justify-between">
					<span className="font-semibold text-foreground text-xs uppercase tracking-widest">
						Overall Progress
					</span>
					<span className="font-medium text-foreground text-sm">
						{isIdle ? "0%" : `${progress}%`}
					</span>
				</div>
				<Progress value={progress} className="h-1" />
			</div>

			<div className="flex flex-col gap-3">
				<div className="flex items-center gap-4 rounded-md border border-border/50 bg-card p-4">
					{renderStepIcon(1)}
					<span className="font-medium text-sm">Collecting liked songs</span>
				</div>

				<div className="flex items-center gap-4 rounded-md border border-border/50 bg-card p-4">
					{renderStepIcon(2)}
					<span className="font-medium text-sm">Collecting playlists</span>
				</div>

				<div className="flex items-center gap-4 rounded-md border border-border/50 bg-card p-4">
					{renderStepIcon(3)}
					<span className="font-medium text-sm">
						Preparing songs for analysis
					</span>
				</div>
			</div>

			<p className="mt-4 text-center text-muted-foreground text-xs">
				This may take a moment depending on the size of your library.
			</p>
		</div>
	);
}
