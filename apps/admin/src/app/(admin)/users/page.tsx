import { AdminShell } from "@/components/app/admin-shell";
import { AdminUsersContent } from "@/components/app/admin-users-content";

type UsersPageProps = {
	searchParams: Promise<{
		page?: string;
		pageSize?: string;
		q?: string;
	}>;
};

export default async function UsersPage({ searchParams }: UsersPageProps) {
	const params = await searchParams;

	const page = Math.max(1, Number(params.page ?? "1") || 1);
	const pageSize = [25, 50, 100].includes(Number(params.pageSize))
		? Number(params.pageSize)
		: 25;
	const q = params.q?.trim() || undefined;

	return (
		<AdminShell title="Users" description="Registered platform users">
			<AdminUsersContent initialParams={{ page, pageSize, q }} />
		</AdminShell>
	);
}
