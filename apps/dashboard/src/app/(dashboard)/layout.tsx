import { redirect } from "next/navigation";

import { DashboardLayoutShell } from "@/components/layout/dashboard-layout-shell";
import { getServerSession } from "@/shared/api/session.server";
import { DASHBOARD_ROUTES } from "@harmonia/common/utils/routes";
import type { Route } from "next";

export default async function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const session = await getServerSession();

	if (!session?.user) {
		redirect("/login");
	}

	if (!session.user.hasCompletedOnboarding) {
		redirect(DASHBOARD_ROUTES.onboarding.index.path as Route);
	}

	return <DashboardLayoutShell>{children}</DashboardLayoutShell>;
}
