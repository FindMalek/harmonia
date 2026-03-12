import { redirect } from "next/navigation";

import { DASHBOARD_ROUTES } from "@harmonia/common/utils/routes";
import { getServerSession } from "@/lib/get-server-session";
import { Header } from "@/components/shared/header";

export default async function OnboardingLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const session = await getServerSession();

	if (!session?.user) {
		redirect("/login");
	}

	if (session.user.hasCompletedOnboarding) {
		redirect(DASHBOARD_ROUTES.overview.path);
	}

	return (
		<div className="flex h-full min-h-svh flex-col bg-background font-sans">
			<div className="flex flex-1 flex-col justify-between p-8 sm:p-12 lg:p-16">
				<Header />

				<div className="flex-1 flex flex-col justify-center">{children}</div>
			</div>
		</div>
	);
}
