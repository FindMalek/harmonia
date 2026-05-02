import { Skeleton } from "@harmonia/ui";

const SKELETON_ROW_KEYS = ["pl-sk-1", "pl-sk-2", "pl-sk-3", "pl-sk-4"] as const;

export function DashboardPlaylistsListSkeleton() {
	return (
		<div className="divide-y divide-border">
			{SKELETON_ROW_KEYS.map((rowKey) => (
				<div key={rowKey} className="space-y-3 py-6">
					<div className="flex items-center justify-between gap-3">
						<Skeleton className="h-3 w-24" />
						<Skeleton className="size-5 shrink-0 rounded-none" />
					</div>
					<Skeleton className="h-6 w-3/5 max-w-xs" />
					<Skeleton className="h-4 w-full max-w-md" />
					<Skeleton className="h-3 w-4/5 max-w-sm" />
				</div>
			))}
		</div>
	);
}
