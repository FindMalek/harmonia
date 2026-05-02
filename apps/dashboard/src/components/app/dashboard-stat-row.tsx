"use client";

import { Skeleton } from "@harmonia/ui";

function DashboardStatRowValueSkeleton() {
	return <Skeleton className="h-4 w-10" />;
}

type StatRowProps = {
	label: string;
	value: number;
	loading?: boolean;
};

export function DashboardStatRow({ label, value, loading }: StatRowProps) {
	return (
		<div className="flex items-center justify-between border-b py-4 last:border-0">
			<span className="text-foreground/80 text-sm">{label}</span>
			<span className="font-mono text-sm">
				{loading ? (
					<DashboardStatRowValueSkeleton />
				) : (
					value.toLocaleString("en-US")
				)}
			</span>
		</div>
	);
}
