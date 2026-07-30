import { DASHBOARD_ROUTES } from "@harmonia/common/utils/routes";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { DashboardLayoutShell } from "@/components/layout/dashboard-layout-shell";
import { getServerSession } from "@/shared/api/session.server";

export default async function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const session = await getServerSession();

	if (!session?.user) {
		redirect("/login");
	}

	// Approval gating happens in proxy.ts before this layout ever renders.

	if (!session.user.hasCompletedOnboarding) {
		redirect(DASHBOARD_ROUTES.onboarding.index.path as Route);
	}

	return <DashboardLayoutShell>{children}</DashboardLayoutShell>;
}
