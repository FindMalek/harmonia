"use client";

import { Skeleton } from "@harmonia/ui";

type StatRowProps = {
	label: string;
	value: number;
	loading?: boolean;
};

export function StatRow({ label, value, loading }: StatRowProps) {
	return (
		<div className="flex items-center justify-between border-b py-4 last:border-0">
			<span className="text-sm">{label}</span>
			<span className="font-mono text-sm">
				{loading ? (
					<Skeleton className="h-4 w-10" />
				) : (
					value.toLocaleString("en-US")
				)}
			</span>
		</div>
	);
}
