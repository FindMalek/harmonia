import { DashboardAnalysisDrawer } from "./dashboard-analysis-drawer";
import { DashboardAnalyzeMusicButton } from "./dashboard-analyze-music-button";
import { DashboardLibraryAnalysis } from "./dashboard-library-analysis";

export function DashboardShell({ children }: { children: React.ReactNode }) {
	return (
		<div className="relative mx-auto max-w-3xl space-y-10 pb-20">
			<div className="space-y-2">
				<h1 className="font-semibold text-3xl">Welcome back</h1>
			</div>

			<DashboardAnalyzeMusicButton />

			{children}

			<DashboardLibraryAnalysis />

			<DashboardAnalysisDrawer />
		</div>
	);
}
