import { Skeleton } from "@harmonia/ui";

export function AdminStatCard({
	label,
	value,
}: {
	label: string;
	value: number | string;
}) {
	const formatted =
		typeof value === "number" ? new Intl.NumberFormat().format(value) : value;

	return (
		<div className="rounded-md border p-4 space-y-1">
			<p className="text-muted-foreground text-xs uppercase tracking-widest">
				{label}
			</p>
			<p className="font-semibold text-2xl tabular-nums">{formatted}</p>
		</div>
	);
}

export function AdminStatCardSkeleton() {
	return (
		<div className="rounded-md border p-4 space-y-1">
			<Skeleton className="h-3 w-24" />
			<Skeleton className="h-8 w-16" />
		</div>
	);
}
