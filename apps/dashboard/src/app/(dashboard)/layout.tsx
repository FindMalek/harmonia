import { redirect } from "next/navigation";

import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
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

	return (
		<div className="grid h-svh grid-rows-[auto_1fr]">
			<div className="flex h-full flex-col gap-0 overflow-hidden">
				<div className="flex-1 overflow-auto p-4 pb-20 md:pb-4">{children}</div>
			</div>
			<MobileBottomNav />
		</div>
	);
}
