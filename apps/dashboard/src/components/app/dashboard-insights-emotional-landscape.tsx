import { Skeleton } from "@harmonia/ui";

type Landscape = {
	angryIntense: number;
	euphoric: number;
	darkBrooding: number;
	chillHappy: number;
};

const QUADRANTS: {
	key: keyof Landscape;
	label: string;
	sub: string;
}[] = [
	{ key: "euphoric", label: "Euphoric / Hype", sub: "High energy · Bright" },
	{
		key: "angryIntense",
		label: "Angry / Intense",
		sub: "High energy · Dark",
	},
	{ key: "chillHappy", label: "Chill / Happy", sub: "Low energy · Bright" },
	{
		key: "darkBrooding",
		label: "Dark / Brooding",
		sub: "Low energy · Dark",
	},
];

export function DashboardInsightsEmotionalLandscapeSkeleton() {
	return (
		<div className="flex flex-col gap-5 border border-border bg-background p-5">
			<div className="flex items-center gap-2 border-b border-border pb-3">
				<Skeleton className="size-1" />
				<Skeleton className="h-2 w-36" />
			</div>
			<div className="grid grid-cols-2 gap-px bg-border">
				{[1, 2, 3, 4].map((i) => (
					<div key={i} className="flex flex-col gap-1.5 bg-background p-3.5">
						<Skeleton className="h-2 w-20" />
						<Skeleton className="h-5 w-12" />
						<Skeleton className="h-2 w-16" />
					</div>
				))}
			</div>
		</div>
	);
}

export function DashboardInsightsEmotionalLandscape({
	landscape,
}: {
	landscape: Landscape;
}) {
	return (
		<div className="flex flex-col gap-5 border border-border bg-background p-5">
			<div className="flex items-center gap-2 border-b border-border pb-3">
				<span className="inline-block size-1 shrink-0 bg-primary" />
				<span className="font-bold font-mono text-[11px] uppercase tracking-widest text-foreground">
					Emotional Landscape
				</span>
			</div>

			<div className="grid grid-cols-2 gap-px border border-border bg-border">
				{QUADRANTS.map(({ key, label, sub }) => (
					<div
						key={key}
						className="flex flex-col gap-1.5 bg-background p-3.5"
					>
						<span className="font-mono text-[9px] uppercase leading-tight tracking-[0.5px] text-muted-foreground">
							{label}
						</span>
						<span className="font-bold text-[15px] text-primary">
							{landscape[key].toLocaleString()}
						</span>
						<span className="font-mono text-[9px] text-muted-foreground">
							{sub}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}
