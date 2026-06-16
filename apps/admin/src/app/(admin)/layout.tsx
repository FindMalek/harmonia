import { redirect } from "next/navigation";

import { AdminLayoutShell } from "@/components/layout/admin-layout-shell";
import { getAdminServerSession } from "@/shared/api/session.server";

export default async function AdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const session = await getAdminServerSession();

	if (!session?.user) {
		redirect("/login");
	}

	if (session.user.role !== "admin") {
		redirect("/login");
	}

	return <AdminLayoutShell>{children}</AdminLayoutShell>;
}
