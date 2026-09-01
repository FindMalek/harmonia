import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Skeleton,
} from "@sonaraem/ui";

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
		<Card>
			<CardHeader>
				<CardTitle className="font-medium text-muted-foreground text-xs uppercase tracking-widest">
					{label}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<p className="font-semibold text-2xl tabular-nums">{formatted}</p>
			</CardContent>
		</Card>
	);
}

export function AdminStatCardSkeleton() {
	return (
		<Card>
			<CardHeader>
				<Skeleton className="h-3 w-24" />
			</CardHeader>
			<CardContent>
				<Skeleton className="h-8 w-16" />
			</CardContent>
		</Card>
	);
}
