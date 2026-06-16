import type { WaitlistStatus } from "@harmonia/common/schemas";

import { AdminShell } from "@/components/app/admin-shell";
import { AdminWaitlistContent } from "@/components/app/admin-waitlist-content";

type WaitlistPageProps = {
	searchParams: Promise<{
		page?: string;
		pageSize?: string;
		status?: string;
		q?: string;
	}>;
};

export default async function WaitlistPage({
	searchParams,
}: WaitlistPageProps) {
	const params = await searchParams;

	const page = Math.max(1, Number(params.page ?? "1") || 1);
	const pageSize = [25, 50, 100].includes(Number(params.pageSize))
		? Number(params.pageSize)
		: 25;
	const validStatuses: WaitlistStatus[] = ["pending", "approved", "rejected"];
	const status = validStatuses.includes(params.status as WaitlistStatus)
		? (params.status as WaitlistStatus)
		: undefined;
	const q = params.q?.trim() || undefined;

	return (
		<AdminShell title="Waitlist" description="Manage waitlist signup requests">
			<AdminWaitlistContent initialParams={{ page, pageSize, status, q }} />
		</AdminShell>
	);
}
