import { Skeleton } from "@harmonia/ui";

type Props = {
	isSystemConnected: boolean;
	isPipelineStable: boolean;
};

export function DashboardInsightsHeaderSkeleton() {
	return (
		<header className="flex flex-col gap-1.5 border-b border-border pb-5">
			<Skeleton className="h-2 w-48" />
			<Skeleton className="h-7 w-24" />
			<Skeleton className="h-3 w-56" />
		</header>
	);
}

export function DashboardInsightsHeader({
	isSystemConnected,
	isPipelineStable,
}: Props) {
	const statusText = [
		isSystemConnected ? "SYSTEM.CONNECTED" : "SYSTEM.DISCONNECTED",
		isPipelineStable ? "PIPELINE.STABLE" : "PIPELINE.RUNNING",
	].join(" // ");

	return (
		<header className="flex flex-col gap-1.5 border-b border-border pb-5">
			<div className="flex items-center gap-1.5">
				<span
					className={`inline-block size-1 shrink-0 ${isPipelineStable && isSystemConnected ? "bg-emerald-500" : "bg-amber-500"}`}
				/>
				<span className="font-mono text-[9px] tracking-[0.5px] text-muted-foreground">
					{statusText}
				</span>
			</div>
			<h1 className="font-bold text-2xl tracking-[-0.5px]">Insights</h1>
			<p className="text-[11px] text-muted-foreground">
				Sonic DNA, moods, and playlist coverage
			</p>
		</header>
	);
}
