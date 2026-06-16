import { AdminShell } from "@/components/app/admin-shell";
import { AdminUsersContent } from "@/components/app/admin-users-content";

export default function UsersPage() {
	return (
		<AdminShell title="Users" description="Registered platform users">
			<AdminUsersContent />
		</AdminShell>
	);
}
