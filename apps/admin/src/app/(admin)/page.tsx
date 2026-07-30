import { Suspense } from "react";

import { AdminShell } from "@/components/app/admin-shell";
import {
	AdminStatsGrid,
	AdminStatsGridSkeleton,
} from "@/components/app/admin-stats-grid";

export default function AdminOverviewPage() {
	return (
		<AdminShell title="Overview" description="Platform health at a glance">
			<Suspense fallback={<AdminStatsGridSkeleton />}>
				<AdminStatsGrid />
			</Suspense>
		</AdminShell>
	);
}
