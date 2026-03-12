import { AnalyzeMusicButton } from "./analyze-music-button";
import { LibraryAnalysis } from "./library-analysis";

export function DashboardShell({ children }: { children: React.ReactNode }) {
	return (
		<div className="mx-auto max-w-3xl space-y-10 pb-20">
			<div className="space-y-2">
				<h1 className="font-semibold text-3xl">Welcome back</h1>
			</div>

			<AnalyzeMusicButton />

			{children}

			<LibraryAnalysis />
		</div>
	);
}
