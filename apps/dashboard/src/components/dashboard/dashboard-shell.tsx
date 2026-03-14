import { AnalyzeMusicButton } from "./analyze-music-button";
import { LibraryAnalysis } from "./library-analysis";
import { AnalysisDrawer } from "./analysis-drawer";
import { PipelineMiniIndicator } from "./pipeline-mini-indicator";

export function DashboardShell({ children }: { children: React.ReactNode }) {
	return (
		<div className="mx-auto max-w-3xl space-y-10 pb-20 relative">
			<div className="space-y-2">
				<h1 className="font-semibold text-3xl">Welcome back</h1>
			</div>

			<AnalyzeMusicButton />

			{children}

			<LibraryAnalysis />

			<AnalysisDrawer />
			<PipelineMiniIndicator />
		</div>
	);
}
